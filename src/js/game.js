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

function makeRollMask() {}
