// =========================================================
// ヨット（アソビ大全ルール）完全解析 ＆ IndexedDB保存版
// =========================================================

// --- I/O用 ---
function output(str) {
    const textarea = document.querySelector("#output");
    if (textarea) {
        textarea.value += str + "\n";
        textarea.scrollTop = textarea.scrollHeight;
    } else {
        console.log(str);
    }
}

let ALL_DICE = [];
let DICE_TO_ID = {};
let ALL_KEEPS = [];
let KEEP_TO_ID = {};
let EMPTY_KID = 0;
let K_START = null;
let K_PROB_F64 = null;
let K_NEXT_I32 = null;
let D_K_START = null;
let D_K_KID_I32 = null;
let SCORE_TABLE = null;
let DP = null;
let dpReady = false;

const currentGame = {
    inProgress: false,
    rollsLeft: 0,
    currentDice: null,
    usedMask: 0,
    upperSum: 0,
    lastKeepMask: "00000",
};

const CATEGORY_DISPLAY = [
    "Ones (ワン)",
    "Twos (ツー)",
    "Threes (スリー)",
    "Fours (フォー)",
    "Fives (ファイブ)",
    "Sixes (シックス)",
    "Choice",
    "4 of a Kind",
    "Full House",
    "S. Straight",
    "L. Straight",
    "Yacht",
];

const CATEGORY_ALIASES = {
    ones: 0,
    one: 0,
    1: 0,
    twos: 1,
    two: 1,
    2: 1,
    threes: 2,
    three: 2,
    3: 2,
    fours: 3,
    four: 3,
    4: 3,
    fives: 4,
    five: 4,
    5: 4,
    sixes: 5,
    six: 5,
    6: 5,
    choice: 6,
    ch: 6,
    4: 7,
    "4kind": 7,
    "4ofakind": 7,
    fourkind: 7,
    fourofakind: 7,
    full: 8,
    fullhouse: 8,
    fullhouse: 8,
    ss: 9,
    s: 9,
    shortstraight: 9,
    shortstraight: 9,
    ls: 10,
    l: 10,
    longstraight: 10,
    longstraight: 10,
    yacht: 11,
    yahtzee: 11,
};

function categoryTokenToIndex(token) {
    let normalized = token
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    if (normalized === "") return null;
    if (CATEGORY_ALIASES[normalized] !== undefined) return CATEGORY_ALIASES[normalized];
    const num = Number(normalized);
    if (!Number.isNaN(num)) {
        if (num >= 0 && num < 12) return num;
        if (num >= 1 && num <= 12) return num - 1;
    }
    return null;
}

function parseDiceText(text) {
    const digits = Array.from(text.matchAll(/[1-6]/g), (m) => Number(m[0]));
    if (digits.length !== 5) return null;
    return digits;
}

function parseDiceList(text) {
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    if (tokens.length !== 5) return null;
    const digits = tokens.map((t) => Number(t));
    if (digits.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) return null;
    return digits;
}

function isNewGameCommand(text) {
    return /^\s*new\s+game\s*$/i.test(text) || /^\s*reset\s*$/i.test(text);
}

function keepMaskFromPositions(positions) {
    const mask = ["0", "0", "0", "0", "0"];
    for (const pos of positions) {
        if (pos >= 1 && pos <= 5) mask[pos - 1] = "1";
    }
    return mask.join("");
}

function parseCategoryList(text) {
    const normalized = text.trim();
    if (normalized === "") return 0;

    if (/^[01]{12}$/.test(normalized)) {
        let mask = 0;
        for (let i = 0; i < 12; i++) {
            if (normalized[11 - i] === "1") mask |= 1 << i;
        }
        return mask;
    }

    const tokens = normalized
        .split(/[ ,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    let mask = 0;
    for (const token of tokens) {
        const idx = categoryTokenToIndex(token);
        if (idx === null) return null;
        mask |= 1 << idx;
    }
    return mask;
}

function getDiceId(dice) {
    const key = [...dice].sort((a, b) => a - b).join("");
    return DICE_TO_ID[key] ?? null;
}

function dpIndex(mask, upperSum) {
    return mask * 64 + upperSum;
}

function getBestTerminalChoice(mask, upperSum, diceId) {
    let bestEv = -Infinity;
    let bestCategory = null;
    let bestScore = 0;
    let bestNextUpper = upperSum;
    const offset = diceId * 12;
    for (let c = 0; c < 12; c++) {
        if ((mask & (1 << c)) !== 0) continue;
        const score = SCORE_TABLE[offset + c];
        let nextUpper = upperSum;
        let added = score;
        if (c < 6) {
            if (upperSum < 63 && upperSum + score >= 63) added += 35;
            nextUpper = Math.min(63, upperSum + score);
        }
        const ev = added + DP[dpIndex(mask | (1 << c), nextUpper)];
        if (ev > bestEv) {
            bestEv = ev;
            bestCategory = c;
            bestScore = score;
            bestNextUpper = nextUpper;
        }
    }
    return { ev: bestEv, category: bestCategory, score: bestScore, nextUpper: bestNextUpper };
}

function bestKeepExpectation(mask, upperSum, diceId, remainingRerolls) {
    const start = D_K_START[diceId];
    const end = D_K_START[diceId + 1];
    let bestEv = -Infinity;
    let bestKid = null;

    const memoFinal = new Map();
    function evalTerminal(nextDiceId) {
        if (memoFinal.has(nextDiceId)) return memoFinal.get(nextDiceId);
        const result = getBestTerminalChoice(mask, upperSum, nextDiceId).ev;
        memoFinal.set(nextDiceId, result);
        return result;
    }

    const memoOneReroll = new Map();
    function evalAfterOneReroll(nextDiceId) {
        if (memoOneReroll.has(nextDiceId)) return memoOneReroll.get(nextDiceId);
        let best = -Infinity;
        const s = D_K_START[nextDiceId];
        const e = D_K_START[nextDiceId + 1];
        for (let i = s; i < e; i++) {
            const kid = D_K_KID_I32[i];
            let ev = 0;
            for (let j = K_START[kid]; j < K_START[kid + 1]; j++) {
                ev += K_PROB_F64[j] * evalTerminal(K_NEXT_I32[j]);
            }
            if (ev > best) best = ev;
        }
        memoOneReroll.set(nextDiceId, best);
        return best;
    }

    for (let i = start; i < end; i++) {
        const kid = D_K_KID_I32[i];
        let ev = 0;
        for (let j = K_START[kid]; j < K_START[kid + 1]; j++) {
            const nextDiceId = K_NEXT_I32[j];
            ev += K_PROB_F64[j] * (remainingRerolls === 1 ? evalTerminal(nextDiceId) : evalAfterOneReroll(nextDiceId));
        }
        if (ev > bestEv) {
            bestEv = ev;
            bestKid = kid;
        }
    }

    return { ev: bestEv, keepId: bestKid };
}

function resolveKeepPositions(dice, keepDice) {
    const targetCounts = {};
    for (const value of keepDice) {
        targetCounts[value] = (targetCounts[value] || 0) + 1;
    }
    const keepPositions = [];
    const rerollPositions = [];
    for (let i = 0; i < dice.length; i++) {
        const value = dice[i];
        if (targetCounts[value] > 0) {
            keepPositions.push(i + 1);
            targetCounts[value] -= 1;
        } else {
            rerollPositions.push(i + 1);
        }
    }
    return { keepPositions, rerollPositions };
}

function describeKeepAction(dice, keepId) {
    if (keepId === null)
        return { verb: "振り直し", keepValues: [], keepPositions: [], rerollPositions: [1, 2, 3, 4, 5] };
    const keepDice = ALL_KEEPS[keepId];
    const positions = resolveKeepPositions(dice, keepDice);
    return {
        keepValues: keepDice,
        keepPositions: positions.keepPositions,
        rerollPositions: positions.rerollPositions,
    };
}

function formatDice(dice) {
    return dice.join(" ");
}

function submitInput() {
    const rawInput = document.querySelector("#input").value.trim();
    if (!rawInput) {
        output("> 入力がありません。new game で開始してください。");
        return;
    }
    if (!dpReady) {
        output("> 解析中です。しばらく待ってから再度入力してください。");
        return;
    }

    const input = rawInput.trim();
    if (isNewGameCommand(input)) {
        currentGame.inProgress = true;
        currentGame.rollsLeft = 3;
        currentGame.currentDice = null;
        currentGame.usedMask = 0;
        currentGame.upperSum = 0;
        currentGame.lastKeepMask = "00000";
        output("> new game: ゲームをリセットしました。");
        output("> 5つのダイスの目を空白区切りで入力してください。例: 1 2 3 4 5");
        return;
    }

    if (!currentGame.inProgress) {
        output("> まず new game と入力してゲームを開始してください。");
        return;
    }

    const dice = parseDiceList(input);
    if (!dice) {
        output("> 5つのダイス目を空白区切りで入力してください。例: 1 2 3 4 5");
        return;
    }

    if (currentGame.rollsLeft <= 0) {
        output("> これ以上振り直しできません。new game で再スタートしてください。");
        return;
    }

    currentGame.currentDice = dice;
    const diceId = getDiceId(dice);
    if (diceId === null) {
        output("> ダイス値に誤りがあります。1〜6の値を5つ入力してください。");
        return;
    }

    const rollsRemaining = currentGame.rollsLeft - 1;
    output(`> 現在のダイス: ${dice.join(" ")}`);
    output(`> 残り振り直し回数: ${rollsRemaining}`);

    if (rollsRemaining <= 0) {
        const terminalChoice = getBestTerminalChoice(currentGame.usedMask, currentGame.upperSum, diceId);
        output(
            `> これが最終ロールです。記入先: ${CATEGORY_DISPLAY[terminalChoice.category]}, 得点=${terminalChoice.score}, 期待値=${terminalChoice.ev.toFixed(3)}点`,
        );
        currentGame.rollsLeft = 0;
        currentGame.lastKeepMask = "00000";
        return;
    }

    const keepDecision = bestKeepExpectation(currentGame.usedMask, currentGame.upperSum, diceId, rollsRemaining);
    const keepInfo = describeKeepAction(dice, keepDecision.keepId);
    const keepMask = keepMaskFromPositions(keepInfo.keepPositions);
    currentGame.rollsLeft = rollsRemaining;
    currentGame.lastKeepMask = keepMask;

    output(`> action: keep=${keepMask}`);
    if (keepInfo.keepPositions.length > 0) {
        output(`> kept positions: ${keepInfo.keepPositions.join(",")}`);
        output(`> kept values: ${keepInfo.keepValues.join(" ")}`);
    } else {
        output(`> kept positions: 00000 (全て振り直し)`);
    }
    output(`> reroll count: ${keepInfo.rerollPositions.length}`);
    output(`> expected value: ${keepDecision.ev.toFixed(3)}点`);
    output(`> ゲーム状態を進めました。次のダイスを入力してください。`);
}

function clearOutput() {
    const textarea = document.querySelector("#output");
    if (textarea) textarea.value = "";
}

// --- IndexedDB（計算結果の保存・読込） ---
async function getDPFromDB() {
    return new Promise((resolve) => {
        const req = indexedDB.open("YachtDB_Clubhouse", 1);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore("dp_store");
        };
        req.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("dp_store")) return resolve(null);
            const getReq = db.transaction("dp_store", "readonly").objectStore("dp_store").get("YachtDP_V1");
            getReq.onsuccess = () => resolve(getReq.result);
            getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
    });
}

async function saveDPToDB(dpArray) {
    return new Promise((resolve) => {
        const req = indexedDB.open("YachtDB_Clubhouse", 1);
        req.onupgradeneeded = (e) => {
            e.target.result.createObjectStore("dp_store");
        };
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction("dp_store", "readwrite");
            tx.objectStore("dp_store").put(dpArray, "YachtDP_V1");
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        };
        req.onerror = () => resolve();
    });
}

// --- アソビ大全準拠 スコア計算 ---
function calcScore(cat, dice) {
    let count = [0, 0, 0, 0, 0, 0, 0];
    let sum = 0;
    for (let d of dice) {
        count[d]++;
        sum += d;
    }

    if (cat < 6) return count[cat + 1] * (cat + 1); // Ones to Sixes
    if (cat === 6) return sum; // Choice

    if (cat === 7) {
        // 4 of a kind (アソビ大全は条件を満たせば「全ダイスの合計」)
        return count.some((c) => c >= 4) ? sum : 0;
    }
    if (cat === 8) {
        // Full House (アソビ大全は「全ダイスの合計」)
        let has3 = count.some((c) => c === 3);
        let has2 = count.some((c) => c === 2);
        let has5 = count.some((c) => c === 5);
        return has5 || (has3 && has2) ? sum : 0;
    }
    if (cat === 9) {
        // S.Straight (15点)
        let mask = 0;
        for (let i = 1; i <= 6; i++) if (count[i] > 0) mask |= 1 << i;
        if ((mask & 0b011110) === 0b011110) return 15;
        if ((mask & 0b111100) === 0b111100) return 15;
        if ((mask & 0b1111000) === 0b1111000) return 15;
        return 0;
    }
    if (cat === 10) {
        // L.Straight (30点)
        let mask = 0;
        for (let i = 1; i <= 6; i++) if (count[i] > 0) mask |= 1 << i;
        if ((mask & 0b0111110) === 0b0111110) return 30;
        if ((mask & 0b1111100) === 0b1111100) return 30;
        return 0;
    }
    if (cat === 11) {
        // Yacht (50点)
        return count.some((c) => c === 5) ? 50 : 0;
    }
    return 0;
}

// --- メイン解析処理 ---
async function runYachtAnalysis() {
    output("データベースを確認中...");
    const cachedDP = await getDPFromDB();

    output("初期テーブルを構築中...");
    const t0 = performance.now();

    // 1. ダイス（252通り）の生成
    ALL_DICE = [];
    DICE_TO_ID = {};
    function genDice(idx, cur) {
        if (cur.length === 5) {
            ALL_DICE.push([...cur]);
            DICE_TO_ID[cur.join("")] = ALL_DICE.length - 1;
            return;
        }
        for (let i = idx; i <= 6; i++) {
            cur.push(i);
            genDice(i, cur);
            cur.pop();
        }
    }
    genDice(1, []);

    // 2. キープ状態（462通り）の生成
    ALL_KEEPS = [];
    KEEP_TO_ID = {};
    for (let len = 0; len <= 5; len++) {
        function genKeep(idx, cur) {
            if (cur.length === len) {
                ALL_KEEPS.push([...cur]);
                KEEP_TO_ID[cur.join("")] = ALL_KEEPS.length - 1;
                return;
            }
            for (let i = idx; i <= 6; i++) {
                cur.push(i);
                genKeep(i, cur);
                cur.pop();
            }
        }
        genKeep(1, []);
    }
    EMPTY_KID = KEEP_TO_ID[""]; // キープ0個（全振り直し）のID

    // 3. スコアテーブル構築
    SCORE_TABLE = new Int32Array(252 * 12);
    for (let d = 0; d < 252; d++) {
        for (let c = 0; c < 12; c++) {
            SCORE_TABLE[d * 12 + c] = calcScore(c, ALL_DICE[d]);
        }
    }

    // 4. キープ状態 -> 振り直し結果の確率分布
    K_START = new Int32Array(462 + 1);
    const K_PROB = [];
    const K_NEXT = [];
    let k_idx = 0;
    for (let k = 0; k < 462; k++) {
        K_START[k] = k_idx;
        const kept = ALL_KEEPS[k];
        const rerolls = 5 - kept.length;
        const denom = Math.pow(6, rerolls);
        const countMap = {};

        function dfs(depth, cur) {
            if (depth === rerolls) {
                const arr = [...kept, ...cur].sort((a, b) => a - b).join("");
                countMap[arr] = (countMap[arr] || 0) + 1;
                return;
            }
            for (let i = 1; i <= 6; i++) {
                cur.push(i);
                dfs(depth + 1, cur);
                cur.pop();
            }
        }
        dfs(0, []);

        for (let key in countMap) {
            K_NEXT.push(DICE_TO_ID[key]);
            K_PROB.push(countMap[key] / denom);
            k_idx++;
        }
    }
    K_START[462] = k_idx;
    K_PROB_F64 = new Float64Array(K_PROB);
    K_NEXT_I32 = new Int32Array(K_NEXT);

    // 5. ダイス状態 -> 選択可能な全キープ状態（重複排除）
    D_K_START = new Int32Array(252 + 1);
    const D_K_KID = [];
    let dk_idx = 0;
    for (let d = 0; d < 252; d++) {
        D_K_START[d] = dk_idx;
        const dice = ALL_DICE[d];
        const uniqueKids = new Set();
        for (let m = 0; m < 32; m++) {
            const kept = [];
            for (let i = 0; i < 5; i++) if (m & (1 << i)) kept.push(dice[i]);
            uniqueKids.add(KEEP_TO_ID[kept.sort((a, b) => a - b).join("")]);
        }
        for (let kid of uniqueKids) {
            D_K_KID.push(kid);
            dk_idx++;
        }
    }
    D_K_START[252] = dk_idx;
    D_K_KID_I32 = new Int32Array(D_K_KID);

    // === DP解析（愚直に全状態をループ） ===
    if (cachedDP) {
        DP = cachedDP instanceof Float64Array ? cachedDP : new Float64Array(cachedDP);
        dpReady = true;
        const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
        output("\n✅ 過去の計算結果（IndexedDB）を読み込みました！");
        output(`💡 ヨットの完全な最大期待値: ${DP[0].toFixed(5)} 点`);
        output(`⏱ テーブル構築時間: ${elapsed} 秒`);
        return;
    }

    DP = new Float64Array(4096 * 64);
    const evRoll0 = new Float64Array(252);
    const evRoll1 = new Float64Array(252);
    const evRoll2 = new Float64Array(252);
    const evKeep1 = new Float64Array(462);
    const evKeep2 = new Float64Array(462);

    const maskByBits = Array.from({ length: 13 }, () => []);
    for (let m = 0; m < 4096; m++) {
        let b = 0,
            tmp = m;
        while (tmp > 0) {
            b += tmp & 1;
            tmp >>= 1;
        }
        maskByBits[b].push(m);
    }

    // 11枠埋め -> 0枠埋め（逆順DP）
    for (let bits = 11; bits >= 0; bits--) {
        const masks = maskByBits[bits];

        for (let mIdx = 0; mIdx < masks.length; mIdx++) {
            const mask = masks[mIdx];

            // 処理が重いため、10マスクごとに画面描画を更新してフリーズを防ぐ
            if (mIdx % 10 === 0) await new Promise((r) => setTimeout(r, 0));

            // 空いている役を抽出
            const emptyCats = [];
            for (let c = 0; c < 12; c++) {
                if ((mask & (1 << c)) === 0) emptyCats.push(c);
            }

            // 無理な足切りをせず、愚直に 0点〜63点 すべてのパターンを計算する
            for (let us = 0; us <= 63; us++) {
                // 1. スコア確定（3回振り終わった後）
                for (let d = 0; d < 252; d++) {
                    let bestScore = -1;
                    const offset = d * 12;
                    for (let i = 0; i < emptyCats.length; i++) {
                        const c = emptyCats[i];
                        let score = SCORE_TABLE[offset + c];
                        let nextUs = us;
                        let added = score;
                        if (c < 6) {
                            if (us < 63 && us + score >= 63) added += 35; // ボーナス達成
                            nextUs = Math.min(63, us + score);
                        }
                        const ev = added + DP[(mask | (1 << c)) * 64 + nextUs];
                        if (ev > bestScore) bestScore = ev;
                    }
                    evRoll0[d] = bestScore;
                }

                // 2. 2回目振り -> キープ選択
                for (let k = 0; k < 462; k++) {
                    let ev = 0;
                    const end = K_START[k + 1];
                    for (let i = K_START[k]; i < end; i++) ev += K_PROB_F64[i] * evRoll0[K_NEXT_I32[i]];
                    evKeep1[k] = ev;
                }
                for (let d = 0; d < 252; d++) {
                    let best = -1;
                    const end = D_K_START[d + 1];
                    for (let i = D_K_START[d]; i < end; i++) {
                        const kid = D_K_KID_I32[i];
                        if (evKeep1[kid] > best) best = evKeep1[kid];
                    }
                    evRoll1[d] = best;
                }

                // 3. 1回目振り -> キープ選択
                for (let k = 0; k < 462; k++) {
                    let ev = 0;
                    const end = K_START[k + 1];
                    for (let i = K_START[k]; i < end; i++) ev += K_PROB_F64[i] * evRoll1[K_NEXT_I32[i]];
                    evKeep2[k] = ev;
                }
                for (let d = 0; d < 252; d++) {
                    let best = -1;
                    const end = D_K_START[d + 1];
                    for (let i = D_K_START[d]; i < end; i++) {
                        const kid = D_K_KID_I32[i];
                        if (evKeep2[kid] > best) best = evKeep2[kid];
                    }
                    evRoll2[d] = best;
                }

                // 4. ターン開始時（まだ何も振っていない）
                let initialEV = 0;
                const end = K_START[EMPTY_KID + 1];
                for (let i = K_START[EMPTY_KID]; i < end; i++) {
                    initialEV += K_PROB_F64[i] * evRoll2[K_NEXT_I32[i]];
                }

                // 期待値をDPテーブルに保存
                DP[mask * 64 + us] = initialEV;
            }
        }

        const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
        output(`枠埋まり数 ${12 - bits}/12 完了... (経過時間: ${elapsed} 秒)`);
    }

    const t1 = performance.now();
    const result = DP[0];

    output(`\n🎉 全計算完了！ 総処理時間: ${((t1 - t0) / 1000).toFixed(2)} 秒`);
    output(`💡 ヨットの完全な最大期待値: ${result.toFixed(5)} 点`);
    output("💾 DBに保存中...");

    await saveDPToDB(DP);
    dpReady = true;
    output("✅ DBへの保存が完了しました！ 次回からは一瞬で呼び出せます。");
}

// 実行
runYachtAnalysis();
