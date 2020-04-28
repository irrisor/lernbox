import * as React from "react";
import {IndexCard, IndexCardInstance, predefinedCards, slots} from "./cards";
import {Pupil} from "./Pupil";
import {History, LocationState} from "history";
import {synchronize} from "./Login";
import {lookupImage} from "./EditCard";

export type PupilSet = Readonly<{ [name: string]: Pupil }>;

export class Context {
    deletePupil(): void {
        const name = this.activePupilName;
        if (name !== undefined) {
            this.update(context => {
                const {[name]: pupil, ...otherPupils} = context._pupils;
                context._pupils = Object.assign({}, otherPupils);
            });
        } else {
            this.update(context => {
                context._pupils = {};
            });
        }
        this.history.push("/");
    }

    createPupil(newName: string) {
        this.update(context => {
            const newPupil: Pupil = {
                name: newName,
                instances: this.cards.map(card => ({
                    id: card.id,
                })),
            };
            context._pupils = Object.assign({}, this.pupils, {
                [newName]: newPupil,
            });
            context._activePupilName = newName;
            context.back();
        });
    }

    back() {
        this.currentInstances = [];
        this.history.push(this.activePupilName !== undefined ? `/pupil/${this.activePupilName}/` : "/");
    }

    private _activePupilName?: string;
    private _currentGroups: string[] = [];
    private _currentInstances: IndexCardInstance[] = [];
    private _cards: IndexCard[] = predefinedCards;
    private _pupils: PupilSet = {};
    public touched: boolean = false;

    public get initialized(): boolean {
        return this._initialized;
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
        this.history.push(`/pupil/${this.activePupilName}/${nextInstances.length > 0 ? "question" : ""}`);
    };

    public getCard(idOrInstance: string | IndexCardInstance | undefined): IndexCard | undefined {
        if (!idOrInstance) return undefined;
        return this.cards.find(card =>
            card.id === (typeof idOrInstance === "string" ? idOrInstance : idOrInstance.id));
    }

    private groupCards(...groups: string[]) {
        const currentGroups = groups.length > 0 ? groups : this.currentGroups;
        return currentGroups.length > 0 ? this.activeInstances.filter(cardInstance =>
                this.inGroup(this.getCard(cardInstance.id), ...currentGroups))
            : this.activeInstances;
    }

    readonly history: History<LocationState>;
    private _initialized: boolean = false;

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

    public get activeInstances(): IndexCardInstance[] {
        return this.pupil ? this.pupil.instances.filter(Context.isCardActive).sort((a, b) => (b.slot || 0) - (a.slot || 0)) : [];
    }

    public groups(topLevel?: boolean, instances?: IndexCardInstance[]) {
        return Array.from(new Set(
            instances ?
                instances.flatMap(card => this.getCard(card.id)?.groups.slice(0, topLevel ? 1 : undefined) || [])
                : this.cards.flatMap(card => card.groups.slice(0, topLevel ? 1 : undefined))),
        ).sort((a, b) => a.localeCompare(b));
    }

    public get activePupilName() {
        return this._activePupilName;
    }

    public set activePupilName(value: string | undefined) {
        if (value !== this._activePupilName) {
            this.update(context => {
                context._activePupilName = value;
                context._currentInstances = [];
                context._currentGroups = [];
            });
        }
    }

    set cards(value: IndexCard[]) {
        for (let i = 0; i < value.length; i++) {
            const anyCard: any = value[i];
            if ( anyCard.image )
            {
                // convert old image data
                const {image, answerImage, imageParameters, answerImageParameters, ...other} = anyCard;
                value[i] = Object.assign(other, {
                    questionImage: image || imageParameters ? {
                        image: image,
                        parameters: imageParameters
                    } : undefined,
                    answerImage: answerImage || answerImageParameters ? {
                        image: answerImage,
                        parameters: answerImageParameters
                    } : undefined
                });
            }
            const card = value[i];
            if ( card.questionImage?.image && !card.questionImage?.url )
            {
                lookupImage(card.questionImage, newImage => card.questionImage = newImage);
                lookupImage(card.answerImage, newImage => card.answerImage = newImage);
            }
        }
        this.update(context => (context._cards = value));
    }

    get cards(): IndexCard[] {
        return this._cards;
    }

    set currentInstances(value: IndexCardInstance[]) {
        this.update(context => (context._currentInstances = value));
    }

    get currentInstances(): IndexCardInstance[] {
        return this._currentInstances;
    }

    public get cardsLeft() {
        return this.groupCards().length;
    }

    public get currentGroups() {
        return this._currentGroups;
    }

    public set currentGroups(value: string[]) {
        this.update(context => (context._currentGroups = value));
    }

    public get cardInstance(): IndexCardInstance | undefined {
        const instances = this.currentInstances;
        return instances.length > 0 ? instances[0] : undefined;
    }

    public get card(): IndexCard | undefined {
        return this.getCard(this.cardInstance);
    }

    public get pupil(): Pupil | undefined {
        return this.activePupilName !== undefined ? this.pupils[this.activePupilName] : undefined;
    }

    public get pupils() {
        return this._pupils;
    }

    public get pupilsList() {
        return (Object.keys(this.pupils) || []).map(name => this.pupils[name]);
    }

    public set pupils(value: PupilSet) {
        if (typeof value !== "object") {
            console.error("Refraining to use value as pupils: ", value);
            value = {};
        }
        Object.keys(value).forEach(name => {
            const pupil = value[name] as any;
            if (pupil.cards) {
                // old data we need to convert
                pupil.instances = pupil.cards.map((old: any): IndexCardInstance => {
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
                delete pupil.cards;
            }
        });
        this.update(context => {
            context._pupils = value;
        });
    }

    constructor(history: History<LocationState>, originalContext?: Context) {
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
            // the only function we should reuse
            this._setContext = originalContext._setContext;
        }
    }

    private _setContext: (newContext: Context) => void = () => {
        throw new Error("setContext not initialized");
    };

    public set setContext(value: (newContext: Context) => void) {
        this._initialized = true;
        this._setContext = value;
    }

    private async update(updateFunction: (newContext: Context) => void) {
        if (this._initialized) {
            const newContext = new Context(this.history, this);
            updateFunction(newContext);
            this._setContext(newContext);
            await synchronize(newContext);
        } else {
            updateFunction(this);
        }
    }

    private inGroup(card: IndexCard | undefined, ...groups: string[]) {
        return card !== undefined && card.groups.filter(group => groups.indexOf(group) >= 0).length > 0;
    }
}

export const reactContext = React.createContext<Context>(undefined as any);
