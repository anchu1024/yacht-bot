const INIT_GAME = {
    turn: 0,
    rollsLeft: 2,
    score: 0,
    dice: [null, null, null, null, null],
    keep: [false, false, false, false, false],
    rolls: new Array(12).fill(0),
    usedRoll: new Array(12).fill(false),
};

let GAME = deepcopy(INIT_GAME);

function makeRollMask() {
    let mask = 0;
    for (let i = 0; i < 12; i++) {
        mask |= (1 & GAME.usedRoll[i]) << i;
    }
    return mask;
}

function terminal(categoryID) {
    const score = YachtSolver.getCategoryScore(categoryID, GAME.dice);
    GAME.usedRoll[categoryID] = true;
    GAME.rolls[categoryID] = score;
    GAME.score += score;
    GAME.rollsLeft = 2;
    GAME.turn++;
    return score;
}
