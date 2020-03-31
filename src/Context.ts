import * as React from "react";
import {cards, IndexCard, slots} from "./cards";
import {Pupil} from "./Pupil";
import {History, LocationState} from "history";

export class Context {
    back() {
        this.currentCards = [];
        this.history.push(this.pupilIndex !== undefined ? `/pupil/${this.pupilIndex}/` : "/");
    }

    private _pupilIndex?: number = 0;
    private _currentGroup?: string;
    private _currentCards: IndexCard[] = [];
    private _pupils: readonly Pupil[] = [
        {
            name: "Sonja",
            cards,
        },
        {
            name: "Christian",
            cards,
        },
    ];
    readonly next = (group?: string) => {
        const oldCard = cards.length > 0 && cards[0] || undefined;
        let nextCards = this.currentCards;
        if (oldCard) {
            if (oldCard.slot !== 0) {
                nextCards = nextCards.slice(1);
            } else {
                nextCards = nextCards.slice(1).concat(oldCard);
            }
        }
        if (nextCards.length === 0 && this.pupil) {
            nextCards = [];
            const currentGroup = group || this.currentGroup;
            const groupCards = currentGroup ? this.activeCards.filter(card => card.groups.indexOf(currentGroup) >= 0)
                : this.activeCards;
            const newCardCount = Math.min(10, groupCards.length);
            console.log(`Selecting ${newCardCount} new cards from ${
                currentGroup ? "group " + currentGroup : "all cards"}.`);
            for (let i = 0; i < newCardCount; i++) {
                const randomIndex = Math.floor(Math.random() * groupCards.length);
                nextCards.push(groupCards[randomIndex]);
                groupCards.splice(randomIndex, 1);
            }
            this.currentGroup = currentGroup;
        }
        this.currentCards = nextCards;
        this.history.push(`/pupil/${this.pupilIndex}/${nextCards.length > 0 ? "question" : ""}`);
    };
    readonly history: History<LocationState>;
    private _initialized: boolean = false;

    public get activeCards(): IndexCard[] {
        const now = Date.now();
        return this.pupil && this.pupil.cards.filter(card => {
            const slot = card.slot || 0;
            if (slot >= slots.length) return false;
            const slotProperties = slots[slot];
            const nextTryDate = (card.slotChanged || 0) +
                slotProperties.durationInDays * 1000 * 60 * 60 * 24;
            return now > nextTryDate;
        }) || [];
    }

    public get pupilIndex() {
        return this._pupilIndex;
    }

    public set pupilIndex(value: number | undefined) {
        if (value !== this._pupilIndex) {
            this.update(context => {
                context._pupilIndex = value;
                context._currentCards = [];
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
        return this.currentCards.length;
    }

    public get currentGroup() {
        return this._currentGroup;
    }

    public set currentGroup(value: string | undefined) {
        this.update(context => (context._currentGroup = value));
    }

    public get card(): IndexCard | undefined {
        const cards = this.currentCards;
        if (cards.length === 0) {
            this.next();
        }
        return cards.length > 0 && cards[0] || undefined;
    }

    public get pupil(): Pupil | undefined {
        return this.pupilIndex !== undefined && this.pupils[this.pupilIndex] || undefined;
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
            localStorage.setItem("pupils", JSON.stringify(this.pupils));
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
        this._setContext(newContext);
    }
}

export const reactContext = React.createContext<Context>(undefined as any);
