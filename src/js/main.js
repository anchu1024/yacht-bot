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
};

const HELP_TEXT = `[bold]COMMAND LIST[/]
Fundamental
* [bg-selection] help [/] : Show help
* [bg-selection] stop [/] : Exit current process / game
* [bg-selection] mode [/] : Show the current mode (Use this when you're lost)
* [bg-selection] rule [/] : Show Yacht rule
* [bg-selection] clear [/] : Clear the screen
* [bg-selection] about [/] : Show about me!
Settings
* [bg-selection] help on [/] : Print [italic]"Type [bg-selection] help [/] to show help."[/]
* [bg-selection] help off [/] : Stop printing [italic]"Type [bg-selection] help [/] to show help."[/]
* [bg-selection] version [/] : Show Yacht Bot version and build info
* [bg-selection] settings [/] : Show all current settings (guide mode, teaching mode status, etc.)
* [bg-selection] settings \[key\] [/] : Display the setting value for the specified key.
* [bg-selection] setting \[setting name\] \[new value\] [/] : Change the specified setting to the given value.
* [bg-selection] reset [/] : Reset all settings to default
Game
* [bg-selection] teach [/] : Start [bold]teaching mode[/]
    >> Teaching Mode: If you enter your current Yacht game state (dice, actions, etc.) from any app, I will tell you the best move.
* [bg-selection] game [/] : Start Yacht with me.
`;

const SYSTEM_INFO_TXT = `[bold]SYSTEM INFO[/]
* [yellow]version[/] : ${META.version}
* [yellow]build date[/] : ${META.build}
* [yellow]author[/] : ${META.author}
* [yellow]ecma version[/] : ${META.jsRequirement}
    Requirements
    * [yellow]Chrome[/] : ${META.browserRequirements.chrome}
    * [yellow]Edge[/] : ${META.browserRequirements.edge}
    * [yellow]Firefox[/] : ${META.browserRequirements.firefox}
    * [yellow]Safari[/] : ${META.browserRequirements.safari}
`;

const ABOUT = `[bold]ABOUT[/]
Terminal風のヨットのボットです。
基本英語なので無理な方は<a href="../ja/index.html">こちら</a>
`;

const RULE = `[bold]RULE[/]
ここでは昔ながらのヨットのルールを採用しています。
ルールの詳細は<a target="_blank" rel="noopener noreferrer nofollow" href="https://psmgp.com/yahtzee">こちら(外部リンク)</a>
`;

function help([val] = []) {
    if (val === undefined) {
        log(HELP_TEXT, { pref: false });
        emptyLine();
    } else {
        const newVal = val === "on" ? true : false;
        SETTINGS.guideEnable = newVal;
        log(`[cyan]\[LOG\] Settings changed![/] Help guide ${newVal ? "enabled" : "disabled"}.`);
    }
}

function showMode() {
    log(`[bold]Mode : ${STAT.mode}[/]`);
}

function CLS() {
    document.querySelector("#output-display").innerHTML = "";
}

function showVersion() {
    log(SYSTEM_INFO_TXT, { pref: false });
    emptyLine();
}

function showSettings([key] = []) {
    if (key !== undefined && !key.startsWith("-")) {
        console.log(key);
        const val = search(SETTINGS, key);
        if (val === "No item found") log(`[red]Invaild setting key[/]`);
        else log(`* [yellow]${key}[/] : ${syntaxHighlight(val)}`, { pref: false, escape: false });
        return;
    }
    log("[bold]SETTINGS[/]", { pref: false });
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
    log("[cyan]\[LOG\] Settings changed![/] All settings reset");
}

function changeSetting([key, val] = []) {
    if (LOCKED_SETTINGS.includes(key)) {
        log(`[red]"${key}" cannot be changed[/]`);
        kill(true);
    }
    const res = searchAndChange(SETTINGS, key, val);
    if (res) log(`[cyan]\[LOG\] Settings changed![/] key: ${key}, new value: ${val}`);
    else log(`[red]failed to change settings. key: ${key}, new value: ${val}[/]`);
}

function searchAndChange(obj, key, val) {
    for (const k of Object.keys(obj)) {
        if (k === key) {
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
    log(ABOUT, { pref: false, escape: false });
    emptyLine();
}

function showRule() {
    log(RULE, { pref: false, escape: false });
    emptyLine();
}

async function main() {
    logo();
    log("[bold]Welcome to Yacht Bot![/] Here you can [bold]play Yacht[/], and I can be [bold]your Yacht teacher[/]!", {
        pref: false,
    });
    emptyLine();
    log("Initializing data...");
    const initInfo = await YachtSolver.init({
        onProgress: ({ completedSlots, totalSlots, elapsedSeconds }) => {
            log(`Processing... ${completedSlots} / ${totalSlots} done!    time : ${elapsedSeconds.toFixed(1)}s`);
        },
    });
    if (initInfo.dpReady) {
        if (initInfo.loadedFromDB) {
            log("[red]Data was already cached. Loading it...[/]");
            log("[green][bold]Success![/][/] Data successfully loaded!");
        } else
            log(
                `[green][bold]Success![/][/] Data successfully initialized!    time : ${initInfo.timeSeconds.toFixed(1)}s`,
            );
    } else {
        log("[red][bold]\[ERROR\][/][/] The process failed.");
    }
    emptyLine();
    log("Hello! I'm [bold]Yachty[/].");
    startREPL();
}

async function startREPL() {
    while (true) {
        if (SETTINGS.guideEnable) log("Type [bg-selection] help [/] to show help.");
        STAT.mode = "Home (choose a mode)";
        try {
            const command = await input();
            await handleCommand(command);
        } catch (e) {
            if (e.message === "process killed") {
                log("Exit current process");
            } else if (e.message !== "process killed (silent)") {
                log("Sorry, error detected.");
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
    const args = filtered.slice(1).filter((token) => !token.startsWith("-"));
    const options = filtered.filter((token) => token.startsWith("-"));
    const formattedOptions = {};
    for (const opt of options) {
        if (opt.includes("=")) {
            const [key, ...vals] = opt.split("=");
            const val = vals[0];
            formattedOptions[key] = val;
        } else {
            formattedOptions[opt] = true;
        }
    }

    return [command, args, options];
}

async function handleCommand(cmd) {
    const res = parseCommand(cmd);
    const head = res[0];
    const args = res[1];
    const opts = res[2];
    if (Object.hasOwn(COMMAND, head)) await COMMAND[head](args, opts);
    else {
        log("[red]ERROR : Command not found[/]");
        kill(true);
    }
}

main();
