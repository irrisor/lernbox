import {IndexCardInstance} from "./cards";

export interface Pupil {
    name: string;
    password: string;
    instances: IndexCardInstance[];
}
