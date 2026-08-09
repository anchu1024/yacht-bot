// Yacht Solver core logic, API version
(function () {
    const CATEGORY_DISPLAY = [
        "Ones",
        "Twos",
        "Threes",
        "Fours",
        "Fives",
        "Sixes",
        "Choice",
        "4 of a Kind",
        "Full House",
        "S. Straight",
        "L. Straight",
        "Yacht",
    ];

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

    function createObjectStore(db) {
        if (!db.objectStoreNames.contains("dp_store")) {
            db.createObjectStore("dp_store");
        }
    }

    function getDPFromDB() {
        return new Promise((resolve) => {
            const req = indexedDB.open("YachtDB_Clubhouse", 1);
            req.onupgradeneeded = (e) => createObjectStore(e.target.result);
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

    function saveDPToDB(dpArray) {
        return new Promise((resolve) => {
            const req = indexedDB.open("YachtDB_Clubhouse", 1);
            req.onupgradeneeded = (e) => createObjectStore(e.target.result);
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

    function calcScore(cat, dice) {
        if (!Array.isArray(dice) || dice.length !== 5) {
            throw new Error("dice must be an array of 5 values");
        }
        const count = [0, 0, 0, 0, 0, 0, 0];
        let sum = 0;
        for (const d of dice) {
            count[d]++;
            sum += d;
        }

        if (cat < 6) return count[cat + 1] * (cat + 1);
        if (cat === 6) return sum;

        if (cat === 7) {
            return count.some((c) => c >= 4) ? sum : 0;
        }
        if (cat === 8) {
            const has3 = count.some((c) => c === 3);
            const has2 = count.some((c) => c === 2);
            const has5 = count.some((c) => c === 5);
            return has5 || (has3 && has2) ? sum : 0;
        }
        if (cat === 9) {
            let mask = 0;
            for (let i = 1; i <= 6; i++) if (count[i] > 0) mask |= 1 << i;
            if ((mask & 0b011110) === 0b011110) return 15;
            if ((mask & 0b111100) === 0b111100) return 15;
            if ((mask & 0b1111000) === 0b1111000) return 15;
            return 0;
        }
        if (cat === 10) {
            let mask = 0;
            for (let i = 1; i <= 6; i++) if (count[i] > 0) mask |= 1 << i;
            if ((mask & 0b0111110) === 0b0111110) return 30;
            if ((mask & 0b1111100) === 0b1111100) return 30;
            return 0;
        }
        if (cat === 11) {
            return count.some((c) => c === 5) ? 50 : 0;
        }
        return 0;
    }

    function getDiceId(dice) {
        const normalized = [...dice].sort((a, b) => a - b);
        return DICE_TO_ID[normalized.join("")] ?? null;
    }

    function dpIndex(mask, upperSum) {
        return mask * 64 + upperSum;
    }

    function keepMaskFromPositions(positions) {
        const mask = ["0", "0", "0", "0", "0"];
        for (const pos of positions) {
            if (Number.isInteger(pos) && pos >= 1 && pos <= 5) {
                mask[pos - 1] = "1";
            }
        }
        return mask.join("");
    }

    function buildStaticTables() {
        if (ALL_DICE.length > 0 && ALL_KEEPS.length > 0) return;

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
        EMPTY_KID = KEEP_TO_ID[""];

        SCORE_TABLE = new Int32Array(252 * 12);
        for (let d = 0; d < 252; d++) {
            for (let c = 0; c < 12; c++) {
                SCORE_TABLE[d * 12 + c] = calcScore(c, ALL_DICE[d]);
            }
        }

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

            for (const key in countMap) {
                K_NEXT.push(DICE_TO_ID[key]);
                K_PROB.push(countMap[key] / denom);
                k_idx++;
            }
        }
        K_START[462] = k_idx;
        K_PROB_F64 = new Float64Array(K_PROB);
        K_NEXT_I32 = new Int32Array(K_NEXT);

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
            for (const kid of uniqueKids) {
                D_K_KID.push(kid);
                dk_idx++;
            }
        }
        D_K_START[252] = dk_idx;
        D_K_KID_I32 = new Int32Array(D_K_KID);
    }

    function keepMaskFromPositions(positions) {
        const mask = ["0", "0", "0", "0", "0"];
        for (const pos of positions) {
            if (Number.isInteger(pos) && pos >= 1 && pos <= 5) {
                mask[pos - 1] = "1";
            }
        }
        return mask.join("");
    }

    function buildStaticTables() {
        if (ALL_DICE.length > 0 && ALL_KEEPS.length > 0) return;

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
        EMPTY_KID = KEEP_TO_ID[""];

        SCORE_TABLE = new Int32Array(252 * 12);
        for (let d = 0; d < 252; d++) {
            for (let c = 0; c < 12; c++) {
                SCORE_TABLE[d * 12 + c] = calcScore(c, ALL_DICE[d]);
            }
        }

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

            for (const key in countMap) {
                K_NEXT.push(DICE_TO_ID[key]);
                K_PROB.push(countMap[key] / denom);
                k_idx++;
            }
        }
        K_START[462] = k_idx;
        K_PROB_F64 = new Float64Array(K_PROB);
        K_NEXT_I32 = new Int32Array(K_NEXT);

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
            for (const kid of uniqueKids) {
                D_K_KID.push(kid);
                dk_idx++;
            }
        }
        D_K_START[252] = dk_idx;
        D_K_KID_I32 = new Int32Array(D_K_KID);
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
                ev +=
                    K_PROB_F64[j] *
                    (remainingRerolls === 1 ? evalTerminal(nextDiceId) : evalAfterOneReroll(nextDiceId));
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
        if (keepId === null) {
            return {
                keepValues: [],
                keepPositions: [],
                rerollPositions: [1, 2, 3, 4, 5],
            };
        }
        const keepDice = ALL_KEEPS[keepId];
        const positions = resolveKeepPositions(dice, keepDice);
        return {
            keepValues: keepDice,
            keepPositions: positions.keepPositions,
            rerollPositions: positions.rerollPositions,
        };
    }

    function validateDice(dice) {
        if (!Array.isArray(dice) || dice.length !== 5) {
            throw new Error("dice must be an array of 5 numeric values");
        }
        for (const d of dice) {
            if (!Number.isInteger(d) || d < 1 || d > 6) {
                throw new Error("dice values must be integers between 1 and 6");
            }
        }
    }

    async function init(options = {}) {
        // options.onProgress: function({ completedSlots, totalSlots, elapsedSeconds })
        if (dpReady) return { dpReady };
        buildStaticTables();
        const cachedDP = await getDPFromDB();
        if (cachedDP) {
            DP = cachedDP instanceof Float64Array ? cachedDP : new Float64Array(cachedDP);
            dpReady = true;
            return { dpReady, loadedFromDB: true, timeSeconds: 0 };
        }

        const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
        DP = new Float64Array(4096 * 64);
        const evRoll0 = new Float64Array(252);
        const evRoll1 = new Float64Array(252);
        const evRoll2 = new Float64Array(252);
        const evKeep1 = new Float64Array(462);
        const evKeep2 = new Float64Array(462);

        const maskByBits = Array.from({ length: 13 }, () => []);
        for (let m = 0; m < 4096; m++) {
            let b = 0;
            let tmp = m;
            while (tmp > 0) {
                b += tmp & 1;
                tmp >>= 1;
            }
            maskByBits[b].push(m);
        }

        const t0 = performance.now();
        for (let bits = 11; bits >= 0; bits--) {
            const masks = maskByBits[bits];
            for (let mIdx = 0; mIdx < masks.length; mIdx++) {
                const mask = masks[mIdx];
                if (mIdx % 10 === 0) await new Promise((r) => setTimeout(r, 0));

                const emptyCats = [];
                for (let c = 0; c < 12; c++) {
                    if ((mask & (1 << c)) === 0) emptyCats.push(c);
                }

                for (let us = 0; us <= 63; us++) {
                    for (let d = 0; d < 252; d++) {
                        let bestScore = -1;
                        const offset = d * 12;
                        for (let i = 0; i < emptyCats.length; i++) {
                            const c = emptyCats[i];
                            let score = SCORE_TABLE[offset + c];
                            let nextUs = us;
                            let added = score;
                            if (c < 6) {
                                if (us < 63 && us + score >= 63) added += 35;
                                nextUs = Math.min(63, us + score);
                            }
                            const ev = added + DP[(mask | (1 << c)) * 64 + nextUs];
                            if (ev > bestScore) bestScore = ev;
                        }
                        evRoll0[d] = bestScore;
                    }

                    for (let k = 0; k < 462; k++) {
                        let ev = 0;
                        const end = K_START[k + 1];
                        for (let i = K_START[k]; i < end; i++) {
                            ev += K_PROB_F64[i] * evRoll0[K_NEXT_I32[i]];
                        }
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

                    for (let k = 0; k < 462; k++) {
                        let ev = 0;
                        const end = K_START[k + 1];
                        for (let i = K_START[k]; i < end; i++) {
                            ev += K_PROB_F64[i] * evRoll1[K_NEXT_I32[i]];
                        }
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

                    let initialEV = 0;
                    const end = K_START[EMPTY_KID + 1];
                    for (let i = K_START[EMPTY_KID]; i < end; i++) {
                        initialEV += K_PROB_F64[i] * evRoll2[K_NEXT_I32[i]];
                    }
                    DP[mask * 64 + us] = initialEV;
                }
            }

            // notify progress: how many of the 12 slots are completed
            if (onProgress) {
                const completedSlots = 12 - bits; // 0..12
                const elapsedSeconds = (performance.now() - t0) / 1000;
                try {
                    onProgress({ completedSlots, totalSlots: 12, elapsedSeconds });
                } catch (e) {
                    /* ignore callback errors */
                }
            }
        }

        const t1 = performance.now();
        const totalSeconds = (t1 - t0) / 1000;
        await saveDPToDB(DP);
        dpReady = true;
        return { dpReady: true, loadedFromDB: false, timeSeconds: totalSeconds };
    }

    function isReady() {
        return dpReady;
    }

    function getBestAction({ dice, usedMask = 0, upperSum = 0, rollsLeft = 2, accumulatedScore = 0 }) {
        // accumulatedScore: UI が既に確定している合計得点（未入力なら 0）
        if (!dpReady) {
            throw new Error("YachtSolver is not ready. Call init() first.");
        }
        validateDice(dice);
        if (!Number.isInteger(usedMask) || usedMask < 0 || usedMask >= 1 << 12) {
            throw new Error("usedMask must be an integer between 0 and 4095");
        }
        if (!Number.isInteger(upperSum) || upperSum < 0 || upperSum > 63) {
            throw new Error("upperSum must be an integer between 0 and 63");
        }
        if (!Number.isInteger(rollsLeft) || rollsLeft < 0 || rollsLeft > 2) {
            throw new Error("rollsLeft must be 0, 1, or 2");
        }
        if (typeof accumulatedScore !== "number" || !Number.isFinite(accumulatedScore)) {
            throw new Error("accumulatedScore must be a finite number");
        }

        const diceId = getDiceId(dice);
        if (diceId === null) {
            throw new Error("invalid dice values");
        }

        // まず，最終記入（terminal）を評価（将来期待値）
        const terminalChoice = getBestTerminalChoice(usedMask, upperSum, diceId);

        // rollsLeft が 0 の場合は強制的に terminal
        if (rollsLeft <= 0) {
            const futureExpected = terminalChoice.ev;
            const totalExpected = accumulatedScore + futureExpected;
            return {
                actionType: "terminal",
                categoryIndex: terminalChoice.category,
                categoryName: CATEGORY_DISPLAY[terminalChoice.category],
                score: terminalChoice.score,
                futureExpected,
                totalExpected,
                nextUpperSum: terminalChoice.nextUpper,
            };
        }

        // 振り直しが可能な場合: keep の期待値も計算し，terminal と比較して最適を返す
        const keepDecision = bestKeepExpectation(usedMask, upperSum, diceId, rollsLeft);
        const keepInfo = describeKeepAction(dice, keepDecision.keepId);
        const keepMask = keepMaskFromPositions(keepInfo.keepPositions);

        const futureExpectedKeep = keepDecision.ev;
        const futureExpectedTerminal = terminalChoice.ev;

        if (futureExpectedTerminal >= futureExpectedKeep) {
            // すぐ記入する方が期待値が高い（または同等）
            const totalExpected = accumulatedScore + futureExpectedTerminal;
            return {
                actionType: "terminal",
                categoryIndex: terminalChoice.category,
                categoryName: CATEGORY_DISPLAY[terminalChoice.category],
                score: terminalChoice.score,
                futureExpected: futureExpectedTerminal,
                totalExpected,
                nextUpperSum: terminalChoice.nextUpper,
            };
        }

        // 振り直してから最適化する方が良い
        const totalExpected = accumulatedScore + futureExpectedKeep;
        return {
            actionType: "keep",
            keepMask,
            keepPositions: keepInfo.keepPositions,
            keepValues: keepInfo.keepValues,
            rerollPositions: keepInfo.rerollPositions,
            futureExpected: futureExpectedKeep,
            totalExpected,
        };
    }

    function getCategoryScore(category, dice) {
        if (!Number.isInteger(category) || category < 0 || category > 11) {
            throw new Error("category must be an integer between 0 and 11");
        }
        validateDice(dice);
        return calcScore(category, dice);
    }

    function getCategoryDisplay() {
        return [...CATEGORY_DISPLAY];
    }

    window.YachtSolver = {
        init,
        isReady,
        getBestAction,
        getCategoryScore,
        getDiceId,
        getCategoryDisplay,
    };
})();
