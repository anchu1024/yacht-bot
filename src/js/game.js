const INIT_GAME = {
    turn: 0,
    rollsLeft: 2,
    score: 0,
    dice: [null, null, null, null, null],
    keep: [false, false, false, false, false],
    roleScore: new Array(12).fill(0),
    usedRole: new Array(12).fill(false),
    bonus: false,
    finish: false,
};

let GAME = deepcopy(INIT_GAME);

const GAME_HISTORY = [];

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
    GAME_HISTORY.length = 0;
    GAME_HISTORY.push(deepcopy(GAME));
    updateDisplay();
    ELEMENT.status.style.display = "block";
}

function teacherReponse() {
    if (GAME.finish) {
        DIALOGUE.game.finished.log();
        return;
    }

    const res = YachtSolver.getBestAction({
        dice: GAME.dice,
        usedMask: makeRoleMask(),
        upperSum: makeUpperSum(),
        rollsLeft: GAME.rollsLeft,
        accumulatedScore: GAME.score + (GAME.bonus ? 35 : 0),
    });

    if (res.actionType === "keep") {
        let str = "";
        for (let i = 0; i < 5; i++) {
            if (res.keepPositions.includes(i + 1)) {
                str += `[red]${GAME.dice[i]}[/] `;
            } else {
                str += `${GAME.dice[i]} `;
            }
        }
        str = str.trim();
        DIALOGUE.teach.showKeepCand.log(str, res.totalExpected.toFixed(1));
    } else if (res.actionType === "terminal") {
        DIALOGUE.teach.showActionCand.log(res.categoryName, res.score, res.totalExpected.toFixed(1));
    }
    GAME.rollsLeft--;
    updateDisplay();
    GAME_HISTORY.push(deepcopy(GAME));
}

function updateDisplay() {
    ELEMENT.game.turn.textContent = `${DIALOGUE.game.display.turn.get()} ${GAME.turn}`;
    ELEMENT.game.roll.textContent = `${DIALOGUE.game.display.rollsLeft.get()} : ${GAME.rollsLeft + 1}`;
    let str = GAME.dice.join(", ");
    if (GAME.dice.includes(null)) {
        str = `<span style="color: ${COLORS.cursor};">Enter your dice rolls.</span>`;
    }
    ELEMENT.game.dice.innerHTML = `${DIALOGUE.game.display.dice.get()} : ${str}`;
    if (GAME.bonus) {
        ELEMENT.game.score.textContent = `${DIALOGUE.game.display.score.get()} : ${GAME.score + 35} (Bonus +35)`;
    } else {
        ELEMENT.game.score.textContent = `${DIALOGUE.game.display.score.get()} : ${GAME.score}`;
    }
    for (let i = 0; i < 12; i++) {
        if (GAME.usedRole[i]) ELEMENT.game.roleDisplay.row[i].classList.add("used");
        else ELEMENT.game.roleDisplay.row[i].classList.remove("used");
        ELEMENT.game.roleDisplay.point[i].textContent = GAME.roleScore[i];
    }
}

function makeRoleMask() {
    let mask = 0;
    for (let i = 0; i < 12; i++) {
        mask |= (1 & GAME.usedRole[i]) << i;
    }
    return mask;
}

function makeUpperSum() {
    let score = 0;
    for (let i = 0; i < 6; i++) {
        score += GAME.roleScore[i];
    }
    return Math.min(score, 63);
}

function choose(name) {
    if (GAME.finish) {
        DIALOGUE.game.finished.log();
        return;
    }
    if (GAME.dice.includes(null)) {
        DIALOGUE.teach.rollPrompt.log();
        return;
    }
    const categoryID = CATEGORY_NAME.indexOf(name);
    if (categoryID === -1) {
        DIALOGUE.game.invalidRole.log();
        return;
    }
    const score = YachtSolver.getCategoryScore(categoryID, GAME.dice);
    GAME.usedRole[categoryID] = true;
    GAME.roleScore[categoryID] = score;
    GAME.score += score;
    GAME.rollsLeft = 2;
    GAME.turn++;
    if (makeUpperSum() >= 63) GAME.bonus = true;
    updateDisplay();
    GAME_HISTORY.push(deepcopy(GAME));
    DIALOGUE.game.updateCategory.log(name, score);
    if (GAME.turn === 12) {
        GAME.finish = true;
        DIALOGUE.teach.finishMsg.log(GAME.score + (GAME.bonus ? 35 : 0));
    }
    return score;
}

function undo() {
    if (GAME_HISTORY.length <= 1) {
        DIALOGUE.game.emptyHistory.log();
        return;
    }
    GAME = GAME_HISTORY[GAME_HISTORY.length - 2];
    GAME_HISTORY.pop();
    DIALOGUE.game.successUndo.log();
    updateDisplay();
}

init();
