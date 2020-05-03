export interface Pupil {
    id: string;
    name: string;
    password: string;
    instances: IndexCardInstance[];
}

export interface IndexCardInstance {
    id: string;
    slot?: number;
    previousSlot?: number;
    slotChanged?: number;
    activityEntries?: ActivityEntry[];
}

export enum Activity {
    VIEW = "view",
    WRONG = "wrong",
    LATE = "late",
    RIGHT = "right"
}

export interface ActivityEntry {
    activity: Activity,
    timestamp: number
}

export function addActivity(instance: IndexCardInstance, activity: Activity) {
    instance.activityEntries = (instance.activityEntries || []).concat({
        activity,
        timestamp: Date.now(),
    })
}
