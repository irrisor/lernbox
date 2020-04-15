import * as React from "react";
import {cards, IndexCard, slots} from "./cards";
import {Pupil} from "./Pupil";
import {History, LocationState} from "history";
import {synchronize} from "./Login";

export class Context {
    deletePupil(): void {
        const index = this.pupilIndex;
        if (index !== undefined) {
            this.update(context => {
                context._pupils = context._pupils.slice(0, index).concat(context._pupils.slice(index + 1));
            });
        } else {
            this.update(context => {
                context._pupils = [];
            });
        }
        this.history.push("/");
    }

    createPupil(newName: string) {
        this.update(context => {
            context._pupils = this.pupils.concat({
                name: newName,
                cards: JSON.parse(JSON.stringify(cards)),
            });
            context._pupilIndex = context._pupils.length - 1;
            context.back();
        });
    }

    back() {
        this.currentCards = [];
        this.history.push(this.pupilIndex !== undefined ? `/pupil/${this.pupilIndex}/` : "/");
    }

    private _pupilIndex?: number;
    private _currentGroup?: string;
    private _currentCards: IndexCard[] = [];
    private _pupils: readonly Pupil[] = [];
    readonly next = (group?: string) => {
        const oldCard = cards.length > 0 ? cards[0] : undefined;
        let nextCards = this.currentCards;
        if (oldCard) {
            if (oldCard.slot !== 0 || (oldCard.previousSlot || 0) > 0) {
                nextCards = nextCards.slice(1);
            } else {
                nextCards = nextCards.slice(1).concat(oldCard);
            }
        }
        const currentGroup = group || this.currentGroup;
        if (nextCards.length === 0 ? this.pupil : currentGroup !== this.currentGroup) {
            nextCards = [];
            const groupCards = this.groupCards(currentGroup);
            const newCardCount = Math.min(10, groupCards.length);
            // console.log(`Selecting ${newCardCount} new cards from ${
            //     currentGroup ? "group " + currentGroup : "all cards"}.`);
            for (let i = 0; i < newCardCount; i++) {
                const firstSlotSize = groupCards.findIndex(
                    card => (card.slot || 0) !== (groupCards[0].slot || 0));
                const randomIndex = Math.floor(Math.random() *
                    (firstSlotSize < 0 ? groupCards.length : firstSlotSize));
                nextCards.push(groupCards[randomIndex]);
                groupCards.splice(randomIndex, 1);
            }
        }
        this.update(context => {
            context._currentGroup = currentGroup;
            context._currentCards = nextCards;
        });
        this.history.push(`/pupil/${this.pupilIndex}/${nextCards.length > 0 ? "question" : ""}`);
    };

    private groupCards(group?: string) {
        const currentGroup = group || this.currentGroup;
        return currentGroup ? this.activeCards.filter(card => card.groups.indexOf(currentGroup) >= 0)
            : this.activeCards;
    }

    readonly history: History<LocationState>;
    private _initialized: boolean = false;

    public static isCardActive(card: IndexCard) {
        const nextTryDate = Context.getNextTryDate(card);
        return nextTryDate ? Date.now() > nextTryDate : false;
    };

    static getNextTryDate(card: IndexCard): number|undefined {
        const slot = card.slot || 0;
        if (slot >= slots.length) return undefined;
        const slotProperties = slots[slot];
        return (card.slotChanged || 0) +
            (slotProperties.durationInDays-0.5) * 1000 * 60 * 60 * 24;
    }

    public get activeCards(): IndexCard[] {
        return this.pupil ? this.pupil.cards.filter(Context.isCardActive).sort((a, b) => (b.slot || 0) - (a.slot || 0)) : [];
    }

    public get pupilIndex() {
        return this._pupilIndex;
    }

    public set pupilIndex(value: number | undefined) {
        if (value !== undefined && (Number.isNaN(value) || value < 0 || value >= this.pupils.length)) {
            value = undefined;
        }
        if (value !== this._pupilIndex) {
            this.update(context => {
                context._pupilIndex = value;
                context._currentCards = [];
                context._currentGroup = undefined;
            });
        }
    }

    set currentCards(value: IndexCard[]) {
        this.update(context => (context._currentCards = value));
    }

    get currentCards(): IndexCard[] {
        return this._currentCards;
    }

    public get cardsLeft() {
        return this.groupCards().length;
    }

    public get currentGroup() {
        return this._currentGroup;
    }

    public set currentGroup(value: string | undefined) {
        this.update(context => (context._currentGroup = value));
    }

    public get card(): IndexCard | undefined {
        const cards = this.currentCards;
        return cards.length > 0 ? cards[0] : undefined;
    }

    public get pupil(): Pupil | undefined {
        return this.pupilIndex !== undefined ? this.pupils[this.pupilIndex] : undefined;
    }

    public get pupils() {
        return this._pupils;
    }

    public set pupils(value: readonly Pupil[]) {
        if (this._initialized) {
            this.update(context => (context._pupils = value));
        } else {
            this._pupils = value;
        }
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

    private update(updateFunction: (newContext: Context) => void) {
        const newContext = new Context(this.history, this);
        updateFunction(newContext);
        synchronize(newContext);
        this._setContext(newContext);
    }
}

export const reactContext = React.createContext<Context>(undefined as any);
