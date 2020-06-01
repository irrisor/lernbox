import * as React from "react";
import {IndexCard, officialOwner, predefinedCards, predefinedCardsHash, slots} from "./cards";
import {IndexCardInstance, Pupil} from "./Pupil";
import {History, LocationState} from "history";
import {sha256} from "js-sha256";
import {v4 as uuidv4} from 'uuid';
import {LocalState, RemoteState, SynchronizationInfo} from "../sync/SynchronizationInfo";
import {PersistentObject} from "./PersistentObject";
import _ from "lodash";

const defaultPupilId = "default-pupil";

interface CardsData {
    predefinedCardsHash: string;
    cards: IndexCard[];
}

interface TeacherData {
    teacherPasswordHash: string;
    pupilIds: string[];
    id: string;
}

export const DEFAULT_TEACHER_ID = "default-teacher";
export const DEFAULT_SCHOOL_ID = "-";
const DEFAULT_TEACHER_PASSWORD_HASH = "acb61a083d4a0c6d7c5ab47f21155903741be5769658b310da9c2a5155bb4d2e";

interface LocalData {
    currentPasswordHash: string;
    menuOpen: boolean;
    schoolId: string;
    teacherId: string;
}

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
            this.persistentLocal = new PersistentObject<LocalData>({
                    currentPasswordHash: "",
                    menuOpen: false as boolean,
                    schoolId: DEFAULT_SCHOOL_ID,
                    teacherId: DEFAULT_TEACHER_ID,
                },
                "local.json",
                this.synchronizationInfo,
                () => "Lokale Daten",
            );
            const teacherId = this.persistentLocal.content.teacherId;
            this.persistentTeacher = this.initializeTeacherObject(teacherId);
            this.persistentCards = this.initializeCardsObject(teacherId);
            this.persistentPupils = this.initializePupilObjects();
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
        this.setPersistentObjectListeners();
    }

    public get superseded(): boolean {
        return !!this.supersededAt;
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

    get schoolId(): string {
        return this.persistentLocal.content.schoolId;
    }

    set schoolId(value: string) {
        if (value !== this.schoolId) {
            this.update(() => {
                    this.persistentLocal.content = Object.assign({}, this.persistentLocal.content, {
                        schoolId: value,
                    });
                },
            );
        }
    }

    get teacherId(): string {
        return this.persistentLocal.content.teacherId;
    }

    set teacherId(value: string) {
        if (value !== this.teacherId) {
            this.update(() => {
                    this.persistentLocal.content = Object.assign({}, this.persistentLocal.content, {
                        teacherId: value,
                    });
                    this.persistentPupils.forEach(pupilObject => pupilObject.delete(false));
                    this.persistentTeacher.delete(false);
                    this.persistentTeacher = this.initializeTeacherObject(value);
                    this.persistentCards.delete(false);
                    this.persistentCards = this.initializeCardsObject(value);
                    this.persistentPupils = this.initializePupilObjects();
                    this.setPersistentObjectListeners();
                },
            );
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

    public set pupil(value: Pupil | undefined) {
        // TODO change pupil
        throw new Error("not implemented");
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
                    persistentPupil.delete(true);
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
            teacherId: this.persistentTeacher.content.id,
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

    public update(updateFunction?: (newContext: Context) => void): Context {
        if (this.supersededAt) {
            console.error("Context was superseded at", this.supersededAt);
            throw new Error("Already superseded context is updated");
        }
        if (this._initialized) {
            const newContext = new Context(this.history, this, false);
            this.supersededAt = new Error("superseded");
            updateFunction && updateFunction(newContext);
            newContext._initialized = true;
            this._setContext(newContext);
            return newContext;
        } else {
            updateFunction && updateFunction(this);
            return this;
        }
    }

    convertPupilCardsToInstances(pupil: Pupil) {
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
        return pupil;
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
            if (!persistentPupil) {
                persistentPupil = this.newPersistentPupil(id);
                context.persistentPupils = context.persistentPupils.concat(persistentPupil);
            }
            persistentPupil.content = newPupilContent;
        });
    }

    public apiFileNameTeacherData(teacherId: string) {
        return `${this.schoolId}/${teacherId}/teacher.json`;
    }

    public modifyPupilsCardInstance(instanceId: string, modify: (instance: IndexCardInstance) => IndexCardInstance) {
        this.update(context => {
            const persistentPupil = context.persistentPupils.find(object => object.content.id === context.currentPupilId);
            if (!persistentPupil) {
                throw new Error("Cannot modify card instances when no peristent pupil is active");
            }
            let modifiedInstance: IndexCardInstance | undefined;
            const instances = persistentPupil.content.instances.map(instance => instance.id === instanceId ?
                modifiedInstance = modify(Object.assign({}, instance)) : instance);
            persistentPupil.content = Object.assign({}, persistentPupil.content, {instances});
            if (modifiedInstance) {
                const modifiedInstanceNotUndefined = modifiedInstance;
                context.currentInstances = context.currentInstances.map(instance => instance.id === instanceId ?
                    modifiedInstanceNotUndefined : instance)
            } else {
                throw new Error("Instance was not found in pupil's card instances");
            }
        });
    }

    private initializePupilObjects() {
        return this.persistentTeacher.content.pupilIds.map(id => this.newPersistentPupil(id));
    }

    private setPersistentObjectListeners() {
        this.synchronizationInfo.objects().forEach(object => object.onStateChange =
            object => this.onPersistentObjectChange(object));
        const teacherAuthKey = () => this.isTeacher && this.currentPasswordHash !== DEFAULT_TEACHER_PASSWORD_HASH ?
            this.currentPasswordHash : undefined;
        this.persistentTeacher.authKey = teacherAuthKey;
        this.persistentCards.authKey = teacherAuthKey;
        this.persistentPupils.forEach(object => object.authKey = () => this.currentPasswordHash ? this.currentPasswordHash : undefined);
    }

    private initializeCardsObject(teacherId: string) {
        return new PersistentObject<CardsData>({
                predefinedCardsHash,
                cards: predefinedCards,
            },
            `${this.schoolId}/${teacherId}/cards.json`,
            this.synchronizationInfo,
            () => "Kartendefinitionen",
        );
    }

    private initializeTeacherObject(teacherId: string) {
        return new PersistentObject<TeacherData>({
                teacherPasswordHash: DEFAULT_TEACHER_PASSWORD_HASH,
                pupilIds: [defaultPupilId],
                id: teacherId,
            },
            this.apiFileNameTeacherData(teacherId),
            this.synchronizationInfo,
            () => "Lehrerdaten",
        );
    }

    private onPersistentObjectChange<T>(object: PersistentObject<T>) {
        if (object.meta.remoteState === RemoteState.MODIFIED &&
            object.meta.localState === LocalState.IN_SYNC) {
            this.update(context => {
                object.applyRemoteContent();
                const pupilIds = context.persistentTeacher.content.pupilIds;
                context.persistentPupils = context.persistentPupils.filter(persistentPupil => {
                    const stillExists = pupilIds.indexOf(persistentPupil.content.id) >= 0;
                    if (!stillExists) {
                        persistentPupil.delete(false);
                    }
                    return stillExists;
                });
                pupilIds.forEach(pupilId => {
                    if (!context.persistentPupils.find(persistentPupil => persistentPupil.content.id === pupilId)) {
                        const newPersistentPupil = context.newPersistentPupil(pupilId);
                        context.persistentPupils.push(newPersistentPupil);
                        context.setPersistentObjectListeners();
                        newPersistentPupil.loadRemote();
                    }
                });
            });
        }
    }

    private newPersistentPupil(id: string) {
        const teacherId = this.persistentTeacher.content.id;
        return new PersistentObject<Pupil>(
            {
                id,
                teacherId,
                name: "default",
                password: "",
                instances: this.getQuestionCardIds().map(cardId => ({id: cardId})),
            },
            `${this.persistentLocal.content.schoolId}/${teacherId}/${id}/pupil.json`,
            this.synchronizationInfo,
            object => {
                return object.content.name === "default" ? "Standardschülerdaten" : "Schülerdaten von " + object.content.name
            },
        );
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
