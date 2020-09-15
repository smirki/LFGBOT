"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = __importDefault(require("fs"));
const fsp = fs_1.default.promises;
let blockedRegex = ["f[a@]gg[o0]t", "ch[i1l]nk", "n[il1](gg|bb)(er|a|@)?", "r[e3]t[a4@]rd"];
function passesFilter(message) {
    for (let index = 0; index < blockedRegex.length; index++) {
        const element = blockedRegex[index];
        const filter = new RegExp(element, "i");
        if (!util_1.isNullOrUndefined(message.match(filter))) {
            return false;
        }
    }
    return true;
}
exports.passesFilter = passesFilter;
async function loadRegex() {
    const blockedPath = path_1.default.join("config", "blocked.yml");
    try {
        await fsp.access(blockedPath);
    }
    catch (e) {
        return;
    }
    const yamlString = await fsp.readFile(blockedPath, {
        encoding: "utf8",
    });
    blockedRegex = js_yaml_1.default.safeLoad(yamlString);
}
exports.loadRegex = loadRegex;
