import "jest";
import {PersistentObject} from "./PersistentObject";
import {SynchronizationInfo} from "../sync/SynchronizationInfo";

const sync = new SynchronizationInfo();

it('freezes objects and arrays', () => {
    const object = new PersistentObject({something: {deep: "fixed"}}, "", sync);
    expect(object.content.something.deep).toEqual("fixed");
    expect(() => object.content.something.deep = "bad").toThrow();

    const array = new PersistentObject([{a: 1}, {a: 2}, {a: 5}], "", sync);
    expect(array.content[0].a).toEqual(1);
    expect(array.content[2].a).toEqual(5);
    expect(() => array.content[0].a = 7).toThrow();
});