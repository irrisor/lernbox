import * as React from "react";
import {
    IndexCard,
    IndexCardInstance,
    officialOwner,
    predefinedCards,
    predefinedCardsHash,
    slots,
    uuidNamespace,
} from "./cards";
import {Pupil} from "./Pupil";
import {History, LocationState} from "history";
import {lookupImage} from "../views/EditCard";
import {sha256} from "js-sha256";
import {v4 as uuidv4, v5 as uuidv5} from 'uuid';
import {SynchronizationInfo} from "../sync/SynchronizationInfo";
import {synchronize} from "../sync/synchronize";

export type PupilSet = Readonly<{ [name: string]: Pupil }>;

const defaultPupilId = uuidv5("default-pupil", uuidNamespace);

export class Context {
    public lastShownList: IndexCard[] = [];
    public touched: boolean = false;
    readonly history: History<LocationState>;
    private predefinedCardsHash: string = "";

    constructor(history: History<LocationState>, originalContext?: Context, init?: boolean) {
        this.history = history;
        if (originalContext) {
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
        }
    }

    get cardsStored(): { cards: IndexCard[]; predefinedCardsHash: string } {
        return {cards: this.cards, predefinedCardsHash: this.predefinedCardsHash};
    }

    set cardsStored(value: { cards: IndexCard[]; predefinedCardsHash: string }) {
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
            value.cards = value.cards.filter(card => (card.owner !== officialOwner) || predefinedIds.has(card.id));
            this.predefinedCardsHash = predefinedCardsHash;
        } else {
            this.predefinedCardsHash = value.predefinedCardsHash;
        }
        this.cards = value.cards;
    }

    private _currentPupilId?: string;

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

    private _currentGroups: string[] = [];

    public get currentGroups() {
        return this._currentGroups;
    }

    public set currentGroups(value: string[]) {
        this.update(context => (context._currentGroups = value));
    }

    private _currentInstances: IndexCardInstance[] = [];

    get currentInstances(): IndexCardInstance[] {
        return this._currentInstances;
    }

    set currentInstances(value: IndexCardInstance[]) {
        this.update(context => (context._currentInstances = value));
    }

    private _cards: IndexCard[] = predefinedCards;

    get cards(): IndexCard[] {
        return this._cards;
    }

    set cards(value: IndexCard[]) {
        for (let i = 0; i < value.length; i++) {
            const anyCard: any = value[i];
            if (anyCard.image) {
                // convert old image data
                const {image, answerImage, imageParameters, answerImageParameters, ...other} = anyCard;
                value[i] = Object.assign(other, {
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
            const card = value[i];
            if (card.questionImage?.image && !card.questionImage?.url) {
                lookupImage(card.questionImage, newImage => card.questionImage = newImage);
                lookupImage(card.answerImage, newImage => card.answerImage = newImage);
            }
        }
        this.update(context => (context._cards = value));
    }

    private _pupils: PupilSet = {
        [defaultPupilId]: {
            id: defaultPupilId,
            name: "default",
            password: "",
            instances: this.getQuestionCardIds().map(id => ({id})),
        },
    };

    public get pupils() {
        return this._pupils;
    }

    public set pupils(value: PupilSet) {
        if (typeof value !== "object") {
            console.error("Refraining to use value as pupils: ", value);
            value = {};
        }
        const questionCards = this.getQuestionCardIds();
        const valueWithFixedPropertyNames: { [name: string]: Pupil } = {};
        Object.keys(value).forEach(name => {
            const pupil = value[name];
            if (pupil.name) {
                const anyPupil: any = pupil;
                if (anyPupil.cards) {
                    // old data we need to convert
                    pupil.instances = anyPupil.cards.map((old: any): IndexCardInstance => {
                        const candidates = this.cards.filter(card =>
                            card.question === old.question);
                        let id;
                        if (candidates.length === 1) {
                            id = candidates[0].id;
                        } else if (candidates.length > 1) {
                            id = candidates.find(card => card.groups[0] === (old.groups && old.groups.length && old.groups[0]))?.id
                                || candidates[0].id;
                        } else {
                            console.error("Error converting old data: No canditate found for card ", old);
                            id = "";
                        }
                        return {
                            id,
                            slot: old.slot,
                            previousSlot: old.previousSlot,
                            slotChanged: old.slotChanged,
                        };
                    }).filter((instance: IndexCardInstance) => instance.id);
                    delete anyPupil.cards;
                }

                if (questionCards.length !== pupil.instances.length) {
                    const questionCardIds = new Set(questionCards);
                    // remove instances we don't know the card for
                    pupil.instances = pupil.instances.filter(instance => questionCardIds.delete(instance.id));
                    // add instances for currently unused cards
                    pupil.instances = pupil.instances.concat(Array.from(questionCardIds.values()).map(id => ({id})));
                }

                if (!pupil.id) {
                    pupil.id = uuidv4();
                }
                if (valueWithFixedPropertyNames[pupil.id]) {
                    console.warn("Found duplicate pupil id in imported data, ignoring", pupil.name, pupil.id);
                } else {
                    valueWithFixedPropertyNames[pupil.id] = pupil;
                }
            }
        });
        this.update(context => {
            context._pupils = valueWithFixedPropertyNames;
        });
    }

    private _currentPasswordHash: string = "";

    get currentPasswordHash(): string {
        return this._currentPasswordHash;
    }

    set currentPasswordHash(value: string) {
        if (value !== this._currentPasswordHash) {
            this.update(context => {
                context._currentPasswordHash = value;
            });
        }
    }

    private _teacherPasswordHash: string = "acb61a083d4a0c6d7c5ab47f21155903741be5769658b310da9c2a5155bb4d2e";

    get teacherPasswordHash(): string {
        return this._teacherPasswordHash;
    }

    set teacherPasswordHash(value: string) {
        if (value !== this._teacherPasswordHash) {
            this.update(context => {
                context._teacherPasswordHash = value;
            });
        }
    }

    private _initialized: boolean = false;

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
        return this.currentPupilId !== undefined ? this.pupils[this.currentPupilId] : undefined;
    }

    public get pupilsList() {
        return (Object.keys(this.pupils) || []).map(name => this.pupils[name]);
    }

    private _setContext: (newContext: Context) => void = () => {
        throw new Error("setContext not initialized");
    };

    public set setContext(value: (newContext: Context) => void) {
        this._initialized = true;
        this._setContext = value;
    }

    get isTeacher(): boolean {
        return !!this.teacherPasswordHash && this.currentPasswordHash === this.teacherPasswordHash;
    }

    private _synchronizationInfo: SynchronizationInfo = new SynchronizationInfo([]);

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
        if (id !== undefined) {
            const {[id]: pupil, ...otherPupils} = this.pupils;
            this.pupils = Object.assign({}, otherPupils);
        } else {
            this.pupils = {};
        }
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

    public async update(updateFunction: (newContext: Context) => void) {
        if (this._initialized) {
            const newContext = new Context(this.history, this, false);
            updateFunction(newContext);
            newContext._initialized = true;
            this._setContext(newContext);
            await synchronize(newContext);
        } else {
            updateFunction(this);
        }
    }

    setPupil(id: string, newPupil: Pupil) {
        if (newPupil.id !== id) {
            throw new Error("Pupil id and given id do not match: " + JSON.stringify(newPupil) + " vs. " + id);
        }
        this.pupils = Object.assign({}, this.pupils, {[id]: newPupil});
    }

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
