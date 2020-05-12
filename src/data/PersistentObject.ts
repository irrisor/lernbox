import _ from "lodash";
import {SynchronizationEntry, SynchronizationInfo, SynchronizationState} from "../sync/SynchronizationInfo";

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

export class PersistentObject<T = unknown> {
    public readonly meta: SynchronizationEntry;
    public remoteContent?: T;
    private synchronizationInfo: SynchronizationInfo;
    public onChange?: (object: PersistentObject<T>, newValue: Readonly<T>) => Readonly<T>;
    public afterChange?: (object: PersistentObject<T>, newValue: Readonly<T>) => void;
    private _content: Readonly<T>;

    constructor(emptyContent: T, key: string, synchronizationInfo: SynchronizationInfo) {
        this.synchronizationInfo = synchronizationInfo;
        this._content = deepFreeze(_.cloneDeep(emptyContent));
        this.meta = {key, version: 0, state: SynchronizationState.OK};
        this.loadLocally();
        synchronizationInfo.add(this);
    }

    private loadLocally() {
        const localContentString = localStorage.getItem(this.meta.key);
        if (localContentString !== null) {
            this.content = JSON.parse(localContentString);
        }
    }

    get content(): Readonly<T> {
        return this._content;
    }

    set content(content: Readonly<T>) {
        this.meta.version++;
        this._content = deepFreeze(_.cloneDeep(this.onChange ? this.onChange(this, content) : content));
        this.storeLocally();
    }

    private storeLocally() {
        localStorage.setItem(this.meta.key, JSON.stringify(this.content));
    }

    delete() {
        this.synchronizationInfo.remove(this);
        localStorage.removeItem(this.meta.key);
        // TODO delete remote
    }
}