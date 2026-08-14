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

const LOCKED_SETTINGS = [];

let SETTINGS = deepcopy(INIT_SETTINGS);

function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}
