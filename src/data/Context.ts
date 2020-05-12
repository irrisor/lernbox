import * as React from "react";
import {IndexCard, officialOwner, predefinedCards, predefinedCardsHash, slots, uuidNamespace} from "./cards";
import {IndexCardInstance, Pupil} from "./Pupil";
import {History, LocationState} from "history";
import {sha256} from "js-sha256";
import {v4 as uuidv4, v5 as uuidv5} from 'uuid';
import {SynchronizationInfo} from "../sync/SynchronizationInfo";
import {synchronize} from "../sync/synchronize";
import {PersistentObject} from "./PersistentObject";
import _ from "lodash";

const defaultPupilId = uuidv5("default-pupil", uuidNamespace);

type CardsData = { predefinedCardsHash: string, cards: IndexCard[] };

type TeacherData = { teacherPasswordHash: string, pupilIds: string[] };

type LocalData = { currentPasswordHash: string, menuOpen: boolean };

export class Context {
    public lastShownList: IndexCard[] = [];
    public touched: boolean = false;
    readonly history: History<LocationState>;
    private supersededAt?: Error;
    private persistentCards: PersistentObject<CardsData>;
    private persistentTeacher: PersistentObject<TeacherData>;
    private persistentLocal: PersistentObject<LocalData>;
    private persistentPupils: PersistentObject<Pupil>[] = [];
    private _currentPupilId?: string;
    private _currentGroups: string[] = [];
    private _currentInstances: IndexCardInstance[] = [];
    private _initialized: boolean = false;
    private _synchronizationInfo: SynchronizationInfo;

    constructor(history: History<LocationState>, originalContext?: Context, init?: boolean) {
        this.history = history;
        if (originalContext) {
            this._synchronizationInfo = originalContext._synchronizationInfo;
            this.persistentCards = originalContext.persistentCards;
            this.persistentTeacher = originalContext.persistentTeacher;
            this.persistentLocal = originalContext.persistentLocal;
            for (const propertyName of Object.keys(originalContext)) {
                const propertyDescriptor = Object.getOwnPropertyDescriptor(
                    originalContext,
                    propertyName,
                );
                if (propertyDescriptor && propertyDescriptor.writable
                    && (typeof propertyDescriptor.value !== "function") && !propertyDescriptor.set) {
                    (this as any)[propertyName] = (originalContext as any)[propertyName];
                }
            }
            // the only function we should reuse is _setContext
            if (init === undefined || init) {
                this.setContext = originalContext._setContext;
            } else {
                this._initialized = false;
                this._setContext = originalContext._setContext;
            }
        } else {
            this._synchronizationInfo = new SynchronizationInfo();
            this.persistentTeacher = new PersistentObject<TeacherData>({
                teacherPasswordHash: "acb61a083d4a0c6d7c5ab47f21155903741be5769658b310da9c2a5155bb4d2e",
                pupilIds: [defaultPupilId],
            }, "teacher.json", this.synchronizationInfo);
            this.persistentLocal = new PersistentObject<LocalData>({
                currentPasswordHash: "",
                menuOpen: false as boolean,
            }, "local.json", this.synchronizationInfo);
            this.persistentCards = new PersistentObject<CardsData>({
                predefinedCardsHash,
                cards: predefinedCards,
            }, "cards.json", this.synchronizationInfo);
            this.persistentPupils = this.persistentTeacher.content.pupilIds.map(id => this.newPersistentPupil(id));
        }

        this.persistentCards.onChange = (object, value) => {
            if (!value.cards && Array.isArray(value)) {
                value = {cards: value, predefinedCardsHash: ""};
            }
            if (value.predefinedCardsHash !== predefinedCardsHash) {
                const predefinedIds = new Set<string>();
                predefinedCards.forEach(predefinedCard => {
                    predefinedIds.add(predefinedCard.id);
                    const cardIndex = value.cards.findIndex(card => card.id === predefinedCard.id);
                    if (cardIndex >= 0) {
                        value.cards[cardIndex] = predefinedCard;
                    } else {
                        value.cards.push(predefinedCard);
                    }
                });
                // finally remove official cards which were removed from the program
                return {
                    cards: value.cards.filter(card => (card.owner !== officialOwner) || predefinedIds.has(card.id)),
                    predefinedCardsHash,
                };
            } else {
                return value;
            }
        };
        this.persistentCards.afterChange = () => this.update();
    }

    public get currentPupilId() {
        return this._currentPupilId;
    }

    public set currentPupilId(value: string | undefined) {
        if (value !== this._currentPupilId) {
            this.update(context => {
                context._currentPupilId = value;
                context._currentInstances = [];
                context._currentGroups = [];
            });
        }
    }

    public get currentGroups() {
        return this._currentGroups;
    }

    public set currentGroups(value: string[]) {
        this.update(context => (context._currentGroups = value));
    }

    get currentInstances(): IndexCardInstance[] {
        return this._currentInstances;
    }

    set currentInstances(value: IndexCardInstance[]) {
        this.update(context => (context._currentInstances = value));
    }

    get cards(): Readonly<IndexCard[]> {
        return this.persistentCards.content.cards;
    }

    set cards(value: Readonly<IndexCard[]>) {
        let mutableValue = _.clone(value) as IndexCard[];
        for (let i = 0; i < value.length; i++) {
            const anyCard: any = value[i];
            if (anyCard.image) {
                // convert old image data
                const {image, answerImage, imageParameters, answerImageParameters, ...other} = anyCard;
                mutableValue[i] = Object.assign(other, {
                    questionImage: image || imageParameters ? {
                        image: image,
                        parameters: imageParameters,
                    } : undefined,
                    answerImage: answerImage || answerImageParameters ? {
                        image: answerImage,
                        parameters: answerImageParameters,
                    } : undefined,
                });
            }
        }
        this.persistentCards.content = Object.assign({}, this.persistentCards.content, {cards: mutableValue});
    }

    get menuOpen(): boolean {
        return this.persistentLocal.content.menuOpen;
    }

    set menuOpen(value: boolean) {
        if (value !== this.menuOpen) {
            this.persistentLocal.content = Object.assign({}, this.persistentLocal.content, {
                menuOpen: value,
            });
        }
    }

    get currentPasswordHash(): string {
        return this.persistentLocal.content.currentPasswordHash;
    }

    set currentPasswordHash(value: string) {
        if (value !== this.currentPasswordHash) {
            this.persistentLocal.content = Object.assign({}, this.persistentLocal.content, {
                currentPasswordHash: value,
            });
        }
    }

    get teacherPasswordHash(): string {
        return this.persistentTeacher.content.teacherPasswordHash;
    }

    set teacherPasswordHash(value: string) {
        if (value !== this.teacherPasswordHash) {
            this.persistentTeacher.content = Object.assign({}, this.persistentTeacher.content, {
                teacherPasswordHash: value,
            });
        }
    }

    public get initialized(): boolean {
        return this._initialized;
    }

    public get activeInstances(): IndexCardInstance[] {
        return this.pupil ? this.pupil.instances.filter(Context.isCardActive).sort((a, b) => (b.slot || 0) - (a.slot || 0)) : [];
    }

    public get cardsLeft() {
        return this.groupCards().length;
    }

    public get cardInstance(): IndexCardInstance | undefined {
        const instances = this.currentInstances;
        return instances.length > 0 ? instances[0] : undefined;
    }

    public get card(): IndexCard | undefined {
        return this.getCard(this.cardInstance);
    }

    public get pupil(): Pupil | undefined {
        return this.currentPupilId !== undefined ?
            this.pupilsList.find(pupil => pupil.id === this.currentPupilId) : undefined;
    }

    public get pupilsList() {
        return this.persistentPupils.map(persistentPupil => persistentPupil.content);
    }

    public set setContext(value: (newContext: Context) => void) {
        this._initialized = true;
        this._setContext = value;
    }

    get isTeacher(): boolean {
        return !!this.teacherPasswordHash && this.currentPasswordHash === this.teacherPasswordHash;
    }

    get synchronizationInfo(): SynchronizationInfo {
        return this._synchronizationInfo;
    }

    set synchronizationInfo(value: SynchronizationInfo) {
        this.update(context =>
            context._synchronizationInfo = value,
        );
    }

    public static isCardActive(instance: IndexCardInstance) {
        const nextTryDate = Context.getNextTryDate(instance);
        return nextTryDate ? Date.now() > nextTryDate : false;
    };

    static getNextTryDate(instance: IndexCardInstance): number | undefined {
        const slot = instance.slot || 0;
        if (slot >= slots.length) return undefined;
        const slotProperties = slots[slot];
        return (instance.slotChanged || 0) +
            (slotProperties.durationInDays - 0.5) * 1000 * 60 * 60 * 24;
    }

    public passwordHash(value?: string) {
        return value !== undefined ? sha256(value) : "";
    }

    deletePupil(): void {
        const id = this.currentPupilId;
        this.update(context => {
            context.persistentPupils = context.persistentPupils.filter(persistentPupil => {
                if (id === undefined || persistentPupil.content.id === id) {
                    persistentPupil.delete();
                    return false;
                } else {
                    return true;
                }
            });
            context.persistentTeacher.content = Object.assign({}, context.persistentTeacher.content, {
                pupilIds: context.persistentTeacher.content.pupilIds
                    .filter(pupilId => !(id === undefined || pupilId === id)),
            });
        });
        this.history.push("/");
    }

    createPupil(name: string, password: string) {
        const newPupil: Pupil = {
            id: uuidv4(),
            name,
            password,
            instances: this.getQuestionCardIds().map(id => ({id})),
        };
        this.setPupil(newPupil.id, newPupil);
    }

    back() {
        this.currentInstances = [];
        this.history.push(this.currentPupilId !== undefined ? `/pupil/${this.pupil?.name || "-"}/${this.currentPupilId}/` : "/");
    }

    readonly next = (...groups: string[]) => {
        const cards = this.currentInstances;
        const oldCard = cards.length > 0 ? cards[0] : undefined;
        let nextInstances = this.currentInstances;
        if (oldCard) {
            if (oldCard.slot !== 0 || (oldCard.previousSlot || 0) > 0) {
                nextInstances = nextInstances.slice(1);
            } else {
                nextInstances = nextInstances.slice(1).concat(oldCard);
            }
        }
        const currentGroups = groups.length > 0 ? groups : this.currentGroups;
        if (nextInstances.length === 0 ? this.pupil : currentGroups !== this.currentGroups) {
            nextInstances = [];
            const groupInstances = this.groupCards(...currentGroups);
            const newCardCount = Math.min(10, groupInstances.length);
            // console.log(`Selecting ${newCardCount} new cards from ${
            //     currentGroups ? "group " + currentGroups : "all cards"}.`);
            for (let i = 0; i < newCardCount; i++) {
                const firstSlotSize = groupInstances.findIndex(
                    card => (card.slot || 0) !== (groupInstances[0].slot || 0));
                const randomIndex = Math.floor(Math.random() *
                    (firstSlotSize < 0 ? groupInstances.length : firstSlotSize));
                nextInstances.push(groupInstances[randomIndex]);
                groupInstances.splice(randomIndex, 1);
            }
        }
        this.update(context => {
            context._currentGroups = currentGroups;
            context._currentInstances = nextInstances;
        });
        this.history.push(`/pupil/${this.pupil?.name || "-"}/${this.currentPupilId}/${nextInstances.length > 0 ? "question" : ""}`);
    };

    public getCard(idOrInstance: string | IndexCardInstance | undefined): IndexCard | undefined {
        if (!idOrInstance) return undefined;
        return this.cards.find(card =>
            card.id === (typeof idOrInstance === "string" ? idOrInstance : idOrInstance.id));
    }

    public groups(topLevel?: boolean, instances?: (IndexCardInstance | IndexCard)[]) {
        return Array.from(new Set(
            instances ?
                instances.flatMap(card => ("groups" in card ? card : this.getCard(card.id))?.groups
                    .slice(0, topLevel ? 1 : undefined) || [])
                : this.cards.flatMap(card => card.groups.slice(0, topLevel ? 1 : undefined))),
        ).sort((a, b) => a.localeCompare(b));
    }

    public update(updateFunction?: (newContext: Context) => void) {
        if (this.supersededAt) {
            console.error("Context was superseded at", this.supersededAt);
            throw new Error("Already superseded context is updated");
        }
        if (this._initialized) {
            const newContext = new Context(this.history, this, false);
            this.supersededAt = new Error("superseded");
            updateFunction && updateFunction(newContext);
            synchronize(newContext);
            newContext._initialized = true;
            this._setContext(newContext);
        } else {
            updateFunction && updateFunction(this);
        }
    }

    setPupil(id: string, newPupilContent: Pupil) {
        if (newPupilContent.id !== id) {
            throw new Error("Pupil id and given id do not match: " + JSON.stringify(newPupilContent) + " vs. " + id);
        }
        this.update(context => {
            const pupilIds = context.persistentTeacher.content.pupilIds;
            if (pupilIds.indexOf(id) === -1) {
                context.persistentTeacher.content = Object.assign({}, context.persistentTeacher.content, {
                    pupilIds: pupilIds.concat(id),
                });
            }
            let persistentPupil = context.persistentPupils.find(pupil => pupil.content.id === id);
            if (persistentPupil) {

            } else {
                persistentPupil = this.newPersistentPupil(id);
                context.persistentPupils = context.persistentPupils.concat(persistentPupil);
            }
            persistentPupil.content = newPupilContent;
        });
    }

    private newPersistentPupil(id: string) {
        return new PersistentObject<Pupil>(
            {
                id,
                name: "default",
                password: "",
                instances: this.getQuestionCardIds().map(cardId => ({id: cardId})),
            }, `pupil-${id}.json`, this.synchronizationInfo);
    }

    private _setContext: (newContext: Context) => void = () => {
        throw new Error("setContext not initialized");
    };

    private getQuestionCardIds() {
        return this.cards.filter(card => card.answers?.length > 0 && card.answers.join("") !== "").map(card => card.id);
    }

    private groupCards(...groups: string[]) {
        const currentGroups = groups.length > 0 ? groups : this.currentGroups;
        return currentGroups.length > 0 ? this.activeInstances.filter(cardInstance =>
                this.inGroup(this.getCard(cardInstance.id), ...currentGroups))
            : this.activeInstances;
    }

    private inGroup(card: IndexCard | undefined, ...groups: string[]) {
        return card !== undefined && card.groups.filter(group => groups.indexOf(group) >= 0).length > 0;
    }
}

export const reactContext = React.createContext<Context>(undefined as any);
