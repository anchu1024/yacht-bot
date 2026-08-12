async function main() {
    logo();
    log(
        "[bold]Welcome to Yacht Bot![/] Here you can [bold]play Yacht[/], and I can be [bold]your Yacht teacher[/]!",
        true,
    );
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
}

main();
