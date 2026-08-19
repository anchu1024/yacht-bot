const DIALOGUE_EN = {
    init: {
        startInit: new Dialogue("Initializing data..."),
        progress: new Dialogue(`Processing... $1 / $2 done!    time : $3s`),
        loadFromDB: new Dialogue("[red]Data was already cached. Loading it...[/]"),
        successLoading: new Dialogue("[green][bold]Success![/][/] Data successfully loaded!"),
        successInit: new Dialogue(`[green][bold]Success![/][/] Data successfully initialized!    time : $1s`),
        fail: new Dialogue("[red][bold]\[ERROR\][/][/] The process failed."),
    },
    game: {
        display: {
            turn: new Dialogue("Turn"),
            rollsLeft: new Dialogue("Rolls left this turn"),
            dice: new Dialogue("Current dice"),
            score: new Dialogue("Current score"),
        },
        roleEmpty: new Dialogue(`[red]\[ERROR\] Category name not found[/]`),
        invalidRole: new Dialogue(`[red]\[ERROR\] Invalid category name[/]`),
        noRollsLeft: new Dialogue(`[red]\[ERROR\] You cannot roll anymore in this turn. Choose a category.[/]`),
        invalidDiceRoll: new Dialogue(`[red]\[ERROR\] Invalid dice roll included (dice roll must be 1 ~ 6)[/]`),
        updateCategory: new Dialogue(`[cyan]\[LOG\] Status changed![/] Fill the category: $1 with $2.`),
        emptyHistory: new Dialogue(`[red]\[ERROR\] History is empty`),
        successUndo: new Dialogue(`[cyan]\[LOG\][/] Undo completed`),
        finished: new Dialogue(`[red]\[ERROR\] Game has already finished`),
    },
    home: {
        help: new Dialogue(
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
            enable: new Dialogue(`[cyan]\[LOG\] Settings changed![/] Help guide enabled`),
            disable: new Dialogue(`[cyan]\[LOG\] Settings changed![/] Help guide disabled`),
        },
        helpGuide: new Dialogue("Type [bg-selection] help [/] to show help."),
        rule: new Dialogue(
            `[bold]RULE[/]
This bot follows the classic, traditional rules of Yacht.
For detailed rules, see <a target="_blank" rel="noopener noreferrer nofollow" href="https://psmgp.com/yahtzee">this external link</a>.
`,
            false,
            false,
        ),
    },
    settings: {
        title: new Dialogue(`[bold]SETTINGS[/]`, false),
        invaildKey: new Dialogue(`[red]Invaild setting key[/]`),
        invalidType: new Dialogue(`[red]\[ERROR\] "$1" accepts only $2`),
        reset: new Dialogue("[cyan]\[LOG\] Settings changed![/] All settings reset"),
        locked: new Dialogue(`[red]"$1" cannot be changed[/]`),
        success: new Dialogue(`[cyan]\[LOG\] Settings changed![/] key: $1, new value: $2`),
        reject: new Dialogue(`[red]failed to change settings. key: $1, new value: $2[/]`),
    },
    teach: {
        start: new Dialogue("[cyan]\[LOG\][/] Teaching mode start!"),
        guide: new Dialogue("[red]!IMPORTANT![/] [bold]type [bg-selection] rule [/] to see how to play[/]"),
        help: new Dialogue(
            `[bold]COMMAND LIST[/]
Teach Mode
* [bg-selection] help [/] : Show help
* [bg-selection] rule [/] : Show the Yacht rules

Fundamental
* [bg-selection] stop [/] : Exit current process / game
* [bg-selection] mode [/] : Show the current mode (Use this when you're lost)
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
`,
            false,
        ),
        rule: new Dialogue(
            `[bold]RULE[/]
The screen on the right shows the current state of your game.  
Please make sure it matches the Yacht game you are playing on your side.

[bold]Input[/]
* [bg-selection] dice [val1] [val2] ... [val5] [/] :  
  Tell me the dice results you just rolled.  
  Enter each value separated by spaces. The order does not matter.

* [bg-selection] set [categoryName] [/] :  
  When you decide which category to score, use this command.  
  Refer to the category list on the right for valid names.
  [bold]If the category name contains spaces, wrap it in quotes (e.g., act "4 of a kind")[/].

* [bg-selecion] undo [/] :
  Use this when you make a mistake

[bold]Output[/]
* keep [val1] [val2] ... [val5] :  
  Returns the dice values you entered.  
  [bold]Dice you should keep will be shown in red.[/]

* choose [categoryName] :  
  Shows the category you should fill in.
`,
        ),
        diceRejectMin: new Dialogue("[red]\[ERROR\] Too few arguments. (5 arguments required)[/]"),
        diceRejectMax: new Dialogue("[red]\[ERROR\] Too many arguments. (5 arguments required)[/]"),
        showKeepCand: new Dialogue(`You should keep red dice.  [bold]$1[/]  (Expected Score : $2)`),
        showActionCand: new Dialogue(
            `You should choose the category: [bold]$1[/]. Category Point : $2, Expected Score : $3`,
        ),
        rollPrompt: new Dialogue(`[red]\[ERROR\] Enter your dice rolls first`),
    },
    welcome: new Dialogue(
        "[bold]Welcome to Yacht Bot![/] Here you can [bold]play Yacht[/], and I can be [bold]your Yacht teacher[/]!",
        false,
    ),
    greeting: new Dialogue("Hello! I'm [bold]Yachty[/]."),
    systemInfo: new Dialogue(
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
    about: new Dialogue(
        `[bold]ABOUT[/]
A terminal-style Yacht bot.
If English is tough, type [bg-selection] japanese [/] to use Japanese.
`,
        false,
        false,
    ),
    mode: {
        display: new Dialogue("[bold]Mode : $1[/]"),
        home: new Dialogue("Home (choose a mode)"),
        teach: new Dialogue("Teaching Mode (type [bg-selection] help [/] to show how to play)"),
    },
    exit: new Dialogue("Exit current process"),
    error: new Dialogue("Sorry, error detected."),
    cmdNotFound: new Dialogue("[red]\[ERROR\] Command not found[/]"),
};
