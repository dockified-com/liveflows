import { describe, expect, it } from "vitest";
import { elementsFromYMap, mergeElementIntoYMap, } from "../canvas-bridge.js";
describe("canvas-bridge", () => {
    it("extracts elements from Y.Map as an array", () => {
        const map = new Map();
        const el1 = { id: "1", version: 1, versionNonce: 100 };
        const el2 = { id: "2", version: 2, versionNonce: 200 };
        map.set("1", el1);
        map.set("2", el2);
        const elements = elementsFromYMap(map);
        expect(elements).toHaveLength(2);
        expect(elements).toEqual([el1, el2]);
    });
    it("inserts new elements into Y.Map", () => {
        const map = new Map();
        const el = { id: "el-1", version: 1, versionNonce: 100 };
        mergeElementIntoYMap(map, el);
        expect(map.get("el-1")).toEqual(el);
    });
    it("updates element with higher version", () => {
        const map = new Map();
        const oldEl = { id: "el-1", version: 1, versionNonce: 100 };
        const newEl = { id: "el-1", version: 2, versionNonce: 50 };
        map.set("el-1", oldEl);
        mergeElementIntoYMap(map, newEl);
        expect(map.get("el-1")).toEqual(newEl);
    });
    it("breaks version ties with lower versionNonce", () => {
        const map = new Map();
        const oldEl = { id: "el-1", version: 2, versionNonce: 100 };
        const tieWinner = {
            id: "el-1",
            version: 2,
            versionNonce: 50,
        };
        map.set("el-1", oldEl);
        mergeElementIntoYMap(map, tieWinner);
        expect(map.get("el-1")).toEqual(tieWinner);
    });
    it("ignores incoming element with lower version", () => {
        const map = new Map();
        const current = { id: "el-1", version: 5, versionNonce: 100 };
        const stale = { id: "el-1", version: 4, versionNonce: 50 };
        map.set("el-1", current);
        mergeElementIntoYMap(map, stale);
        expect(map.get("el-1")).toEqual(current);
    });
});
//# sourceMappingURL=canvas-bridge.test.js.map