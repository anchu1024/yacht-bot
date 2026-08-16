const COMMAND = {
    help: help,
    mode: showMode,
    clear: CLS,
    version: showVersion,
    settings: showSettings,
    reset: resetSettings,
    setting: changeSetting,
    about: showAbout,
    rule: showRule,
    teach: startTeachMode,
};

const TEACH_COMMAND = inherit(COMMAND, {
    // 後で追加する。keepやterminal(act)など
});

function help([val] = []) {
    if (val === undefined) {
        DIALOGUE.home.help.log();
        emptyLine();
    } else {
        const newVal = val === "on" ? true : false;
        SETTINGS.guideEnable = newVal;
        if (newVal) DIALOGUE.home.toggleHelp.enable.log();
        else DIALOGUE.home.toggleHelp.disable.log();
    }
}

function showMode() {
    DIALOGUE.mode.display.log(STAT.mode);
}

function CLS() {
    document.querySelector("#output-display").innerHTML = "";
}

function showVersion() {
    DIALOGUE.systemInfo.log();
    emptyLine();
}

function showSettings([key] = []) {
    if (key !== undefined && !key.startsWith("-")) {
        console.log(key);
        const val = search(SETTINGS, key);
        if (val === "No item found") DIALOGUE.settings.invaildKey.log();
        else log(`* [yellow]${key}[/] : ${syntaxHighlight(val)}`, { pref: false, escape: false });
        return;
    }
    DIALOGUE.settings.title.log();
    expandSettings(SETTINGS);
    emptyLine();
}

function search(obj, key) {
    for (const k of Object.keys(obj)) {
        if (k === key) {
            return obj[k];
        }

        if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
            const res = search(obj[k], key);
            if (res !== "No item fouond") return res;
        }
    }
    return "No item found";
}

function expandSettings(obj) {
    for (const [key, val] of Object.entries(obj)) {
        if (Array.isArray(val)) {
            log(`* [yellow]${key}[/] : ${syntaxHighlight(JSON.stringify(val))}`, {
                pref: false,
                escape: false,
            });
        } else if (typeof val === "object" && val !== null) {
            expandSettings(val);
        } else {
            log(`* [yellow]${key}[/] : ${syntaxHighlight(val)}`, { pref: false, escape: false });
        }
    }
}

function resetSettings() {
    SETTINGS = deepcopy(INIT_SETTINGS);
    DIALOGUE.settings.reset.log();
}

function changeSetting([key, val] = []) {
    if (LOCKED_SETTINGS.includes(key)) {
        DIALOGUE.settings.locked.log(key);
        kill(true);
    }
    try {
        const res = searchAndChange(SETTINGS, key, val);
        if (res) DIALOGUE.settings.success.log(key, val);
        else DIALOGUE.settings.reject.log(key, val);
    } catch (e) {
        DIALOGUE.settings.invalidType.log(key, ALLOWED_VALUES[key].map((el) => `[italic]${String(el)}[/]`).join(", "));
    }
}

function searchAndChange(obj, key, val) {
    for (const k of Object.keys(obj)) {
        if (k === key) {
            if (!ALLOWED_VALUES[k].includes(val)) throw new Error("Invalid type");
            obj[k] = val;
            return true;
        }

        if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
            const res = searchAndChange(obj[k], key, val);
            if (res) return true;
        }
    }
    return false;
}

function showAbout() {
    DIALOGUE.about.log();
    emptyLine();
}

function showRule() {
    DIALOGUE.home.rule.log();
    emptyLine();
}

async function main() {
    logo();
    DIALOGUE.welcome.log();
    emptyLine();
    DIALOGUE.init.startInit.log();
    const initInfo = await YachtSolver.init({
        onProgress: ({ completedSlots, totalSlots, elapsedSeconds }) => {
            DIALOGUE.init.progress.log(completedSlots, totalSlots, elapsedSeconds.toFixed(1));
        },
    });
    if (initInfo.dpReady) {
        if (initInfo.loadedFromDB) {
            DIALOGUE.init.loadFromDB.log();
            DIALOGUE.init.successLoading.log();
        } else DIALOGUE.init.successInit.log(initInfo.timeSeconds.toFixed(1));
    } else {
        DIALOGUE.init.fail.log();
    }
    emptyLine();
    DIALOGUE.greeting.log();
    startREPL();
}

async function startREPL() {
    while (true) {
        if (SETTINGS.guideEnable) DIALOGUE.home.helpGuide.log();
        STAT.mode = DIALOGUE.mode.home.get();
        try {
            const command = await input();
            await handleCommand(command);
        } catch (e) {
            if (e.message === "process killed") {
                DIALOGUE.exit.log();
            } else if (e.message !== "process killed (silent)") {
                DIALOGUE.error.log();
                log(`[red]\[ERROR\][/] ${e.stack}`);
            }
        }
    }
}

function parseCommand(cmd) {
    const tokenRegex =
        /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--?[a-zA-Z0-9-]+(?:=(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+))?|\/\/.*$|#.*$|\s+|\S+/g;

    const tokens = cmd.match(tokenRegex);
    if (!tokens) return null;
    const filtered = tokens.filter(
        (token) => !/^\s+$/.test(token) && !token.startsWith("//") && !token.startsWith("#"),
    );
    const command = filtered[0];
    const args = filtered
        .slice(1)
        .filter((token) => !token.startsWith("-"))
        .map((el) => normalize(el));
    const options = filtered.filter((token) => token.startsWith("-"));
    const formattedOptions = {};
    for (const opt of options) {
        if (opt.includes("=")) {
            const [key, ...vals] = opt.split("=");
            const val = vals[0];
            formattedOptions[key] = normalize(val);
        } else {
            formattedOptions[opt] = true;
        }
    }

    return [command, args, options];
}

async function handleCommand(cmd, list = COMMAND) {
    const res = parseCommand(cmd);
    const head = res[0];
    const args = res[1];
    const opts = res[2];
    if (Object.hasOwn(list, head)) await list[head](args, opts);
    else {
        DIALOGUE.cmdNotFound.log();
        kill(true);
    }
}

async function startTeachMode() {
    STAT.mode = DIALOGUE.mode.teach.get();
    initStatus();
    DIALOGUE.teach.start.log();
    DIALOGUE.teach.guide.log();
    try {
        do {
            const cmd = await input();
            handleCommand(cmd, TEACH_COMMAND);
        } while (!GAME.finish);
    } catch (e) {
        if (e.message === "process killed") {
            ELEMENT.status.style.display = "none";
            kill();
        }
    }
}

main();
