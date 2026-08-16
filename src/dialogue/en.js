const DIALOGUE = {
    init: {
        startInit: new Dialog("Initializing data..."),
        progress: new Dialog(`Processing... $1 / $2 done!    time : $3s`),
        loadFromDB: new Dialog("[red]Data was already cached. Loading it...[/]"),
        successLoading: new Dialog("[green][bold]Success![/][/] Data successfully loaded!"),
        successInit: new Dialog(`[green][bold]Success![/][/] Data successfully initialized!    time : $1s`),
        fail: new Dialog("[red][bold]\[ERROR\][/][/] The process failed."),
    },
    game: {
        display: {
            turn: new Dialog("Turn"),
            rollsLeft: new Dialog("Rolls left this turn"),
            score: new Dialog("Current score"),
        },
    },
    home: {
        help: new Dialog(
            `[bold]COMMAND LIST[/]
Fundamental
* [bg-selection] help [/] : Show help
* [bg-selection] stop [/] : Exit current process / game
* [bg-selection] mode [/] : Show the current mode (Use this when you're lost)
* [bg-selection] rule [/] : Show the Yacht rules
* [bg-selection] clear [/] : Clear the screen
* [bg-selection] about [/] : Show information about me!
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
`,
            false,
        ),
        toggleHelp: {
            enable: new Dialog(`[cyan]\[LOG\] Settings changed![/] Help guide enabled`),
            disable: new Dialog(`[cyan]\[LOG\] Settings changed![/] Help guide disabled`),
        },
        helpGuide: new Dialog("Type [bg-selection] help [/] to show help."),
        rule: new Dialog(
            `[bold]RULE[/]
ここでは昔ながらのヨットのルールを採用しています。
ルールの詳細は<a target="_blank" rel="noopener noreferrer nofollow" href="https://psmgp.com/yahtzee">こちら(外部リンク)</a>
`,
            false,
            false,
        ),
    },
    settings: {
        title: new Dialog(`[bold]SETTINGS[/]`, false),
        invaildKey: new Dialog(`[red]Invaild setting key[/]`),
        invalidType: new Dialog(`[red]\[ERROR\] "$1" accepts only $2`),
        reset: new Dialog("[cyan]\[LOG\] Settings changed![/] All settings reset"),
        locked: new Dialog(`[red]"$1" cannot be changed[/]`),
        success: new Dialog(`[cyan]\[LOG\] Settings changed![/] key: $1, new value: $2`),
        reject: new Dialog(`[red]failed to change settings. key: $1, new value: $2[/]`),
    },
    teach: {
        start: new Dialog("[cyan]\[LOG\][/] Teaching mode start!"),
        guide: new Dialog("[red]!IMPORTANT![/] [bold]type [bg-selection] rule [/] to see how to play[/]"),
    },
    welcome: new Dialog(
        "[bold]Welcome to Yacht Bot![/] Here you can [bold]play Yacht[/], and I can be [bold]your Yacht teacher[/]!",
        false,
    ),
    greeting: new Dialog("Hello! I'm [bold]Yachty[/]."),
    systemInfo: new Dialog(
        `[bold]SYSTEM INFO[/]
* [yellow]version[/] : ${META.version}
* [yellow]build date[/] : ${META.build}
* [yellow]author[/] : ${META.author}
* [yellow]ecma version[/] : ${META.jsRequirement}
    Requirements
    * [yellow]Chrome[/] : ${META.browserRequirements.chrome}
    * [yellow]Edge[/] : ${META.browserRequirements.edge}
    * [yellow]Firefox[/] : ${META.browserRequirements.firefox}
    * [yellow]Safari[/] : ${META.browserRequirements.safari}
`,
        false,
    ),
    about: new Dialog(
        `[bold]ABOUT[/]
Terminal風のヨットのボットです。
基本英語なので無理な方は<a href="../ja/index.html">こちら</a>
`,
        false,
        false,
    ),
    mode: {
        display: new Dialog("[bold]Mode : $1[/]"),
        home: new Dialog("Home (choose a mode)"),
        teach: new Dialog("Teaching Mode (type [bg-selection] help [/] to show how to play)"),
    },
    exit: new Dialog("Exit current process"),
    error: new Dialog("Sorry, error detected."),
    cmdNotFound: new Dialog("[red]ERROR : Command not found[/]"),
};
