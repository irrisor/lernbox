import {PersistentObject} from "../data/PersistentObject";

export enum SynchronizationState {
    OK = "ok",
    ERROR = "error",
    CONFLICT = "conflict",
}

export interface SynchronizationEntry {
    state: SynchronizationState;
    readonly key: string;
    remoteTimestamp?: number;
    remoteSyncTimestamp?: number;
    localTimestamp?: number;
    version: number;
}

export class SynchronizationInfo {
    private readonly persistentObjects: PersistentObject[];

    constructor() {
        this.persistentObjects = [];
    }

    public get(key: string): PersistentObject | undefined {
        return this.persistentObjects.find(entry => entry.meta.key === key);
    }

    public add(persistentObject: PersistentObject<any>) {
        this.persistentObjects.push(persistentObject);
    }

    public objects(): Readonly<Array<PersistentObject>> {
        return this.persistentObjects;
    }

    public remove(persistentObject: PersistentObject<any>) {
        const index = this.persistentObjects.indexOf(persistentObject);
        if ( index !== -1 )
        {
            this.persistentObjects.splice(index, 1);
        }
    }
}