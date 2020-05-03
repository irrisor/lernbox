import {IndexCardInstance} from "./cards";

export interface Pupil {
    id: string;
    name: string;
    password: string;
    instances: IndexCardInstance[];
}
