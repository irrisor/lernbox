import * as React from "react";
import {IndexCard, officialOwner, predefinedCards, predefinedCardsHash, slots} from "./cards";
import {IndexCardInstance, Pupil} from "./Pupil";
import {History, LocationState} from "history";
import {sha256} from "js-sha256";
import {v4 as uuidv4} from 'uuid';
import {LocalState, RemoteState, SynchronizationInfo} from "../sync/SynchronizationInfo";
import {PersistentObject} from "./PersistentObject";
import _ from "lodash";
import version from "../version.json";

export const DEFAULT_PUPIL_ID = "default-pupil";

interface CardsData {
    predefinedCardsHash: string;
    cards: IndexCard[];
}

interface TeacherData {
    teacherPasswordHash: string;
    pupilIds: string[];
    id: string;
    readPasswordHash: string;
}

type GroupsData = Array<{
    group_id: string,
    group_name: string,
    pupils: Array<{
        user_id: string,
        user_name: string,
    }>,
}>;

export const DEFAULT_TEACHER_ID = "default-teacher";
export const DEFAULT_SCHOOL_ID = "-";
const DEFAULT_TEACHER_PASSWORD_HASH = "acb61a083d4a0c6d7c5ab47f21155903741be5769658b310da9c2a5155bb4d2e";

interface LocalData {
    currentPasswordHash: string;
    menuOpen: boolean;
    schoolId: string;
    teacherId: string;
}

export function getCard(cards: Readonly<Array<IndexCard>>, idCardOrInstance: string | IndexCardInstance | IndexCard | undefined) {
    if (!idCardOrInstance) return undefined;
    if (typeof idCardOrInstance === "object" && "groups" in idCardOrInstance) {
        return idCardOrInstance;
    }
    return cards.find(card =>
        card.id === (typeof idCardOrInstance === "string" ? idCardOrInstance : idCardOrInstance.id));
}

export function getQuestionCards(cards: Readonly<Array<IndexCard>>) {
    return cards.filter(card => card.answers?.length > 0 && card.answers.join("") !== "");
}

const appStartTime = Date.now();

export class Context {
    public lastShownList: IndexCard[] = [];
    public touched: boolean = false;
    readonly history: History<LocationState>;
    private supersededAt?: Error;
    private persistentCards: PersistentObject<CardsData>;
    private persistentTeacher: PersistentObject<TeacherData>;
    private persistentGroups: PersistentObject<GroupsData>;
    private persistentLocal: PersistentObject<LocalData>;
    private persistentPupils: PersistentObject<Pupil>[] = [];
    private persistentVersion: PersistentObject<typeof version>;
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
            this.persistentGroups = originalContext.persistentGroups;
            this.persistentLocal = originalContext.persistentLocal;
            this.persistentVersion = originalContext.persistentVersion;
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
            this.persistentGroups = this.initializeGroupsObject(teacherId);
            this.persistentCards = this.initializeCardsObject(teacherId);
            this.persistentPupils = this.initializePupilObjects();
            this.persistentVersion = new PersistentObject<typeof version>(version,
                "../version.json",
                this.synchronizationInfo,
                () => "Versionsinformation",
            );
            this.persistentVersion.authKey = () => "none required";
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

    public get pupilGroups(): Readonly<GroupsData> {
        return this.persistentGroups.content;
    }

    public get readPasswordHash(): string {
        return this.persistentTeacher.content.readPasswordHash;
    }

    public set readPasswordHash(value: string) {
        if (value !== this.readPasswordHash) {
            this.persistentTeacher.content = Object.assign({}, this.persistentTeacher.content, {
                readPasswordHash: value,
            });
        }
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
                if (value && !context.isTeacher && context.persistentTeacher.content.pupilIds.indexOf(value) === -1) {
                    console.log("Initializing single pupil data")
                    const newPersistentPupil = this.newPersistentPupil(value);
                    context.persistentPupils = [newPersistentPupil];
                    context.persistentTeacher.content = Object.assign({}, context.persistentTeacher.content, {
                        pupilIds: context.persistentTeacher.content.pupilIds.concat(value),
                    })
                    context.setPersistentObjectListeners();
                    this.persistentCards.loadRemote();
                    newPersistentPupil.loadRemote();
                } else {
                    context.setPersistentObjectListeners();
                }
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
            this.update(context => {
                    context.persistentLocal.content = Object.assign({}, context.persistentLocal.content, {
                        teacherId: value,
                    });
                    context.persistentPupils.forEach(pupilObject => pupilObject.delete(false));
                    context.persistentTeacher.delete(false);
                    context.persistentTeacher = context.initializeTeacherObject(value);
                    context.persistentGroups.delete(false);
                    context.persistentGroups = context.initializeGroupsObject(value);
                    context.persistentCards.delete(false);
                    context.persistentCards = context.initializeCardsObject(value);
                    context.persistentPupils = context.initializePupilObjects();
                    context.setPersistentObjectListeners();
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
        if (!value) return;
        const persistentPupil = this.persistentPupils.find(persistentPupil => persistentPupil.content.id === this.currentPupilId);
        if (!persistentPupil) throw new Error("current pupil not found");
        persistentPupil.content = value;
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

    public pupilById = (id: string) => this.pupilsList.find(pupil => pupil.id === id);

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

    createPupil(name: string, password: string, id = uuidv4()) {
        const newPupil: Pupil = {
            id,
            teacherId: this.persistentTeacher.content.id,
            name,
            password,
            instances: [],
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
        const pupilPath = `/pupil/${this.pupil?.name || "-"}/${this.currentPupilId}/`;
        if (nextInstances.length > 0) {
            const path = pupilPath + "question";
            const currentPath = this.history.location.pathname;
            switch (currentPath.substring(currentPath.lastIndexOf("/") + 1)) {
                case "question":
                case "late":
                case "wrong":
                    this.history.replace(path);
                    break;
                default:
                    this.history.push(path);
                    break;
            }
        } else {
            this.history.push(pupilPath + "finished");
        }
    };

    public getCard(idCardOrInstance: string | IndexCardInstance | IndexCard | undefined): IndexCard | undefined {
        return getCard(this.cards, idCardOrInstance);
    }

    public groups(topLevel?: boolean, instances?: Readonly<Array<IndexCardInstance | IndexCard>>) {
        return Array.from(new Set(
            instances ?
                instances.flatMap(card => ("groups" in card ? card : this.getCard(card.id))?.groups
                    .slice(0, topLevel ? 1 : undefined) || [])
                : this.cards.flatMap(card => card.groups.slice(0, topLevel ? 1 : undefined))),
        ).sort((a, b) => a.localeCompare(b));
    }

    public update(updateFunction?: (newContext: Context) => void): Context {
        if (this._initialized) {
            if (this.supersededAt) {
                console.error("Context was superseded at", this.supersededAt);
                throw new Error("Already superseded context is updated");
            }
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
            context.setPersistentObjectListeners();
            persistentPupil.content = newPupilContent;
        });
    }

    public apiFileNameTeacherData(teacherId: string) {
        return `${this.schoolId}/${teacherId}/teacher.json`;
    }

    public modifyPupilsCardInstance(instanceId: string,
                                    modify: (instance: IndexCardInstance) => IndexCardInstance | null = instance => instance,
                                    pupilId = this.currentPupilId,
    ) {
        this.update(context => {
            const persistentPupil = context.persistentPupils.find(object => object.content.id === pupilId);
            if (!persistentPupil) {
                throw new Error("Cannot modify card instances when no persistent pupil is active");
            }
            let modifiedInstance: IndexCardInstance | undefined | null;
            let instances = persistentPupil.content.instances.map(instance =>
                instance.id === instanceId ? (modifiedInstance = modify(Object.assign({}, instance))) : instance)
                .filter(instance => instance != null);
            if (modifiedInstance === undefined) {
                modifiedInstance = modify({id: instanceId});
                if (modifiedInstance) {
                    instances = instances.concat(modifiedInstance);
                }
            }
            persistentPupil.content = Object.assign({}, persistentPupil.content, {instances});
            if (modifiedInstance) {
                const modifiedInstanceNotUndefined = modifiedInstance;
                context.currentInstances = context.currentInstances.map(instance => instance.id === instanceId ?
                    modifiedInstanceNotUndefined : instance)
            } else if (modifiedInstance === null) {
                context.currentInstances = context.currentInstances.filter(instance => instance.id !== instanceId);
            }
        });
    }

    public getQuestionCards() {
        return getQuestionCards(this.cards);
    }

    clearCard() {
        if (this.currentInstances.length > 0) {
            this.currentInstances = [];
        }
    }

    public loadNewRelease() {
        try {
            if (version.version !== this.persistentVersion.content.version) {
                const myRelease = version.version.split("-")[0].split(".");
                const serverRelease = this.persistentVersion.content.version.split("-")[0].split(".");
                for (let i = 0; i < myRelease.length; i++) {
                    if ( myRelease[i] < serverRelease[i] ) {
                        if ( appStartTime < Date.now() - 1000*60*60) {
                            console.error("reloading application because the server version is higher");
                            window.location.reload();
                        } else {
                            console.log("server version is higher, but the app runs less than an hour");
                        }
                        return;
                    }
                    if ( myRelease[i] > serverRelease[i] ) {
                        // we are higher?!?
                        return;
                    }
                }
            }
        } catch (e) {
            console.error("failed to check version", e);
        }
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
        this.persistentGroups.authKey = teacherAuthKey;
        this.persistentCards.authKey = () => this.isTeacher && this.currentPasswordHash !== DEFAULT_TEACHER_PASSWORD_HASH ?
            this.currentPasswordHash : this.persistentTeacher.content.readPasswordHash;
        this.persistentPupils.forEach(object => object.authKey = () => this.currentPasswordHash ? (
            this.currentPasswordHash + ":" + sha256(object.content.password)) : (this.readPasswordHash || undefined));
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
                pupilIds: [],
                id: teacherId,
                readPasswordHash: "",
            },
            this.apiFileNameTeacherData(teacherId),
            this.synchronizationInfo,
            () => "Lehrerdaten",
        );
    }

    private initializeGroupsObject(teacherId: string) {
        return new PersistentObject<GroupsData>([],
            `${this.schoolId}/${teacherId}/groups.json`,
            this.synchronizationInfo,
            () => "Gruppeninformation mit Schülerliste",
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
                instances: this.getQuestionCards().map(card => ({id: card.id})),
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
