import _ from "lodash";
import {LocalState, RemoteState, SynchronizationEntry, SynchronizationInfo} from "../sync/SynchronizationInfo";

function deepFreeze<T>(object: T): Readonly<T> {
    if (!_.isObjectLike(object)) {
        return object as Readonly<T>;
    }

    Object.freeze(object);
    _.forOwn(object, function (value) {
        if (!_.isObjectLike(value) ||
            Object.isFrozen(value)) {
        } else {
            deepFreeze(value);
        }
    });

    return object;
}

const META_PREFIX = "meta.";

class Remote {
    private timer?: NodeJS.Timeout;
    private lastTimestamp?: number;
    private running: boolean = false;

    public schedule(operation: () => void, timeInMS: number, maxTimeInMS?: number) {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        this.timer = setTimeout(operation, timeInMS);
        if ((this.lastTimestamp || 0) + (maxTimeInMS || timeInMS) < Date.now()) {
            operation();
        }
    }

    public async perform(operation: () => Promise<void>) {
        if (this.running) return;
        this.running = true;
        try {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = undefined;
            }
            this.lastTimestamp = Date.now();
            await operation();
        } finally {
            this.running = false;
        }
    }
}

export class PersistentObject<T = unknown> {
    public readonly meta: SynchronizationEntry;
    public remoteContent?: T;
    public onChange?: (object: PersistentObject<T>, newValue: Readonly<T>) => Readonly<T>;
    public afterChange?: (object: PersistentObject<T>, newValue: Readonly<T>) => void;
    public onStateChange?: (object: PersistentObject<T>) => void;
    public authKey?: (object: PersistentObject<T>) => string | undefined;
    private synchronizationInfo: SynchronizationInfo;
    private _content: Readonly<T>;
    private readonly _description: (object: PersistentObject<T>) => string;
    private remoteStoreState = new Remote();
    private remoteLoadState = new Remote();
    private localStoreOrLoad = false;

    constructor(emptyContent: T, key: string, synchronizationInfo: SynchronizationInfo,
                description: (object: PersistentObject<T>) => string,
    ) {
        this.synchronizationInfo = synchronizationInfo;
        this._description = description;
        this._content = deepFreeze(_.cloneDeep(emptyContent));
        this.meta = {key, version: 0, localState: LocalState.IN_SYNC, remoteState: RemoteState.NON_EXISTENT};
        this.loadLocally();
        synchronizationInfo.add(this);
        this.scheduleLoadRemote();
    }

    public get description(): string {
        return this._description(this);
    }

    get content(): Readonly<T> {
        return this._content;
    }

    set content(content: Readonly<T>) {
        this.meta.version++;
        this.apply(content);
        this.storeLocally(true);
        this.afterChange && this.afterChange(this, this.content);
        this.scheduleStoreRemote();
    }

    applyRemoteContent() {
        if (this.meta.remoteState === RemoteState.MODIFIED &&
            this.meta.localState === LocalState.IN_SYNC) {
            console.debug("applying remote content for", this.meta.key);
            this.apply(this.remoteContent as T /*just to remove Readonly*/);
            this.meta.remoteState = RemoteState.IN_SYNC;
            this.meta.localTimestamp = this.meta.remoteTimestamp;
            this.storeLocally(false);
        } else {
            throw new Error("Illegal state for applying remote content: " + JSON.stringify(this.meta));
        }
    }

    delete(deleteRemote: boolean) {
        this.synchronizationInfo.remove(this);
        localStorage.removeItem(META_PREFIX + this.meta.key);
        localStorage.removeItem(this.meta.key);
        if (deleteRemote) {
            // TODO delete remote
        }
    }

    public async loadRemote(authKeyValue?: string) {
        if (!this.authKey) return;
        if (!authKeyValue) {
            authKeyValue = this.authKey(this);
        }
        if (!authKeyValue) return;
        this.remoteStoreState.perform(async () => {
            console.debug("checking remote of", this.meta.key);
            const headers: HeadersInit = {
                "Authorization": "Bearer " + authKeyValue,
            };
            if (this.meta.remoteHash) {
                headers["If-None-Match"] = this.meta.remoteHash;
            }
            const response = await fetch(`/api/${this.meta.key}`,
                {
                    method: "GET",
                    headers,
                });
            switch (response.status) {
                case 304: // Not Modified
                    // ok, everything is fine, we don't need to download it
                    console.debug("no new content for", this.meta.key);
                    break;
                case 200: // OK
                    // we've found new content
                    const hash = response.headers.get("ETag") || undefined;
                    if (this.meta.remoteState !== RemoteState.CONFLICT) {
                        switch (this.meta.localState) {
                            case LocalState.ERROR:
                            case LocalState.IN_SYNC:
                                console.debug("found new content for", this.meta.key, ":", hash);
                                this.meta.remoteState = RemoteState.MODIFIED;
                                break;
                            case LocalState.UPLOADING:
                            case LocalState.MODIFIED:
                                console.debug("found conflicting content for", this.meta.key, ":", hash);
                                this.meta.remoteState = RemoteState.CONFLICT;
                                break;
                        }
                    } else {
                        console.debug("found still conflicting content for", this.meta.key, ":", hash);
                    }
                    this.meta.remoteTimestamp = Date.now();
                    this.meta.remoteHash = hash;
                    this.remoteContent = await response.json();
                    this.onStateChange && this.onStateChange(this);
                    break;
                case 404:
                    if (this.meta.remoteState === RemoteState.NON_EXISTENT) {
                        console.debug("still does not exist: ", this.meta.key);
                        break;
                    }
                // fall through to error
                default:
                    this.meta.remoteState = RemoteState.ERROR;
                    console.debug("download failed", this.meta.key, ":", response);
                    this.onStateChange && this.onStateChange(this);
                    throw response;
            }
            this.storeMetaLocally();
            this.scheduleLoadRemote();
        });
    }

    private apply(content: Readonly<T>) {
        this._content = deepFreeze(_.cloneDeep(this.onChange ? this.onChange(this, content) : content));
    }

    private loadLocally() {
        this.localStoreOrLoad = true;
        try {
            const localMetaString = localStorage.getItem(META_PREFIX + this.meta.key);
            if (localMetaString !== null) {
                Object.assign(this.meta, JSON.parse(localMetaString));
            }
            const localContentString = localStorage.getItem(this.meta.key);
            if (localContentString !== null) {
                this.content = JSON.parse(localContentString);
            }
        } finally {
            this.localStoreOrLoad = false;
        }
    }

    private storeLocally(touch: boolean) {
        if (this.localStoreOrLoad) return;
        this.localStoreOrLoad = true;
        try {
            localStorage.setItem(this.meta.key, JSON.stringify(this.content));
            if (touch) {
                this.meta.localTimestamp = Date.now();
                switch (this.meta.localState) {
                    case LocalState.IN_SYNC:
                    case LocalState.UPLOADING:
                    case LocalState.MODIFIED:
                        this.meta.localState = LocalState.MODIFIED;
                        break;
                    case LocalState.ERROR:
                        // keep it
                        break;
                }
            }
            this.storeMetaLocally();
        } finally {
            this.localStoreOrLoad = false;
        }
    }

    private storeMetaLocally() {
        localStorage.setItem(META_PREFIX + this.meta.key, JSON.stringify(this.meta));
    }

    private scheduleLoadRemote() {
        if (this.meta.remoteState === RemoteState.IN_SYNC || this.meta.remoteState === RemoteState.MODIFIED) {
            this.remoteLoadState.schedule(() => this.loadRemote(), 60000);
        }
    }

    private scheduleStoreRemote() {
        if (this.meta.localState === LocalState.MODIFIED) {
            console.debug("scheduling upload of", this.meta.key);
            this.remoteStoreState.schedule(() => this.storeRemote(), 10000, 60000);
        }
    }

    private async storeRemote() {
        if (!this.authKey) return;
        const authKeyValue = this.authKey(this);
        if (!authKeyValue) return;
        this.remoteStoreState.perform(async () => {
            const headers: HeadersInit = {
                "Authorization": "Bearer " + authKeyValue,
            };
            if (this.meta.remoteHash) {
                console.debug("uploading new version of ", this.meta.key);
                headers["If-Match"] = this.meta.remoteHash;
            } else {
                console.debug("uploading first version of ", this.meta.key);
            }
            this.meta.localState = LocalState.UPLOADING;
            const response = await fetch(`/api/${this.meta.key}`,
                {
                    method: "PUT",
                    headers,
                    body: JSON.stringify(this.content),
                });
            switch (response.status) {
                case 412: // Precondition Failed
                case 409: // Conflict
                    this.meta.remoteState = RemoteState.CONFLICT;
                    this.meta.remoteConflictHash = response.headers.get("ETag") || undefined;
                    console.debug("conflict detected for ", this.meta.key, ": ", this.meta.remoteConflictHash);
                    break;
                case 200: // OK
                case 201: // Created
                    this.meta.remoteState = RemoteState.IN_SYNC;
                    this.meta.remoteHash = response.headers.get("ETag") || undefined;
                    if (this.meta.localState === LocalState.UPLOADING) {
                        this.meta.localState = LocalState.IN_SYNC;
                        console.debug("uploaded ", this.meta.key, ": ", this.meta.remoteHash);
                    } else {
                        console.debug("uploaded ", this.meta.key, ": ", this.meta.remoteHash, ", but was already modified locally");
                    }
                    this.meta.remoteTimestamp = Date.now();
                    break;
                default:
                    this.meta.remoteState = RemoteState.ERROR;
                    console.debug("upload failed", this.meta.key, ":", response);
                    this.onStateChange && this.onStateChange(this);
                    throw response;
            }
            this.storeMetaLocally();
            this.onStateChange && this.onStateChange(this);
            this.scheduleLoadRemote();
        });
    }
}