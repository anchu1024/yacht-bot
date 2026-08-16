const INIT_GAME = {
    turn: 0,
    rollsLeft: 2,
    score: 0,
    dice: [null, null, null, null, null],
    keep: [false, false, false, false, false],
    rolls: new Array(12).fill(0),
    usedRoll: new Array(12).fill(false),
    finish: false,
};

let GAME = deepcopy(INIT_GAME);

const CATEGORY_NAME = YachtSolver.getCategoryDisplay();

function init() {
    const tbody = document.querySelector("#status-display tbody");
    for (let i = 0; i < 12; i++) {
        const tr = document.createElement("tr");
        const name = document.createElement("th");
        const point = document.createElement("td");

        tr.dataset.categoryIndex = i;

        name.textContent = CATEGORY_NAME[i];
        point.textContent = 0;

        tr.appendChild(name);
        tr.appendChild(point);

        tbody.appendChild(tr);

        ELEMENT.game.roleDisplay.row.push(tr);
        ELEMENT.game.roleDisplay.name.push(name);
        ELEMENT.game.roleDisplay.point.push(point);
    }
}

function initStatus() {
    GAME = deepcopy(INIT_GAME);
    updateDisplay();
    ELEMENT.status.style.display = "block";
}

function updateDisplay() {
    ELEMENT.game.turn.textContent = `${DIALOGUE.game.display.turn.get()} ${GAME.turn}`;
    ELEMENT.game.roll.textContent = `${DIALOGUE.game.display.rollsLeft.get()} : ${GAME.rollsLeft}`;
    ELEMENT.game.score.textContent = `${DIALOGUE.game.display.score.get()} : ${GAME.score}`;

    for (let i = 0; i < 12; i++) {
        if (GAME.usedRoll[i]) ELEMENT.game.roleDisplay.row[i].classList.add("used");
        else ELEMENT.game.roleDisplay.row[i].classList.remove("used");
        ELEMENT.game.roleDisplay.point[i].textContent = GAME.rolls[i];
    }
}

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

init();
