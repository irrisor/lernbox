interface SynchronizationEntry {
    key: string;
    remoteDate?: string;
    remoteSyncDate?: string;
    localDate?: string;
}

export class SynchronizationInfo {
    private readonly synchronizationEntries: SynchronizationEntry[];

    constructor(synchronizationEntries: SynchronizationEntry[]) {
        this.synchronizationEntries = synchronizationEntries;
    }

    public get(key: string): SynchronizationEntry {
        const existingEntry = this.synchronizationEntries.find(entry => entry.key === key);
        if (!existingEntry) {
            const newEntry = {key};
            this.synchronizationEntries.push(newEntry);
            return newEntry;
        } else {
            return existingEntry;
        }
    }

    public entries(): Readonly<Array<SynchronizationEntry>> {
        return this.synchronizationEntries;
    }
}