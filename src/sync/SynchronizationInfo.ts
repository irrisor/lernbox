import {PersistentObject} from "../data/PersistentObject";

export enum RemoteState {
    NON_EXISTENT = "no",
    IN_SYNC = "ok",
    MODIFIED = "downloaded",
    ERROR = "error",
    CONFLICT = "conflict",
}

export enum LocalState {
    IN_SYNC = "ok",
    MODIFIED = "modified",
    UPLOADING = "uploading",
    ERROR = "error",
}

export interface SynchronizationEntry {
    localState: LocalState;
    remoteState: RemoteState;
    readonly key: string;
    remoteTimestamp?: number;
    remoteSyncTimestamp?: number;
    localTimestamp?: number;
    version: number;
    remoteHash?: string;
    remoteConflictHash?: string;
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
        if (index !== -1) {
            this.persistentObjects.splice(index, 1);
        }
    }
}