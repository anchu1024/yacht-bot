const STAT = {
    inputEnable: false,
    userInputPromise: null,
    mode: null,
};

const META = {
    version: "v1.0.0",
    build: "2026-08-14",
    author: "X+C Core",
    jsRequirement: "ES2022+",
    browserRequirements: {
        chrome: "92+",
        edge: "92+",
        firefox: "92+",
        safari: "15.4+",
    },
};

const INIT_SETTINGS = {
    guideEnable: true,
};

const ALLOWED_VALUES = {
    guideEnable: [true, false],
};

const LOCKED_SETTINGS = [];

let SETTINGS = deepcopy(INIT_SETTINGS);

function deepcopy(obj) {
    return structuredClone(obj);
}

function inherit(parent, child) {
    for (const [key, val] of Object.entries(parent)) {
        if (typeof val === "object" && val !== null) {
            child[key] = deepcopy(val);
        } else {
            child[key] = val;
        }
    }
    return child;
}

function normalize(str) {
    if (/^"([^"]*)"$/.test(str)) return str.match(/^"([^"]*)"$/)[1];
    if (!Number.isNaN(Number(str))) return Number(str);
    if (str === "true") return true;
    if (str === "false") return false;
    if (str === "null") return null;
    if (str === "undefined") return undefined;
    return str;
}
