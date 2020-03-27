import * as React from "react";
import { cards, IndexCard } from "./cards";
import { Pupil } from "./Pupil";

export class Context {
  private _pupilName? = "Sonja";
  private _cardsLeft?: number;
  private _currentIndex?: number;
  private _pupils: readonly Pupil[] = [
    {
      name: "Sonja",
      cards
    },
    {
      name: "Christian",
      cards
    }
  ];
  public get pupilName() {
    return this._pupilName;
  }
  public set pupilName(value: string | undefined) {
    this.update(context => (context._pupilName = value));
  }
  public get cardsLeft() {
    return this._cardsLeft;
  }
  public set cardsLeft(value: number | undefined) {
    this.update(context => (context._cardsLeft = value));
  }
  public get currentIndex() {
    return this._currentIndex;
  }
  public set currentIndex(value: number | undefined) {
    this.update(context => (context._currentIndex = value));
  }
  public get card(): IndexCard|undefined {
    return this.pupil && this.pupil.cards[this.currentIndex || 0];
  }
  public get pupil(): Pupil|undefined {
    return this.pupils.find(pupil => pupil.name === this.pupilName);
  }

  public get pupils() {
    return this._pupils;
  }

  constructor(originalContext?: Context) {
    if (originalContext) {
      for (const propertyName of Object.keys(originalContext)) {
        const propertyDescriptor = Object.getOwnPropertyDescriptor(
          originalContext,
          propertyName
        );
        if (propertyDescriptor && !propertyDescriptor.set) {
          (this as any)[propertyName] = (originalContext as any)[propertyName];
        }
      }
    }
  }

  public setContext: (newContext: Context) => void = () => {
    throw new Error("setContext not initialized");
  };

  private update(updateFunction: (newContext: Context) => void) {
    const newContext = new Context(this);
    updateFunction(newContext);
    this.setContext(newContext);
  }
}
export const reactContext = React.createContext(new Context());
