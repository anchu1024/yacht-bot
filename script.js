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

// --- IndexedDB（計算結果の保存・読込） ---
async function getDPFromDB() {
    return new Promise((resolve) => {
        const req = indexedDB.open("YachtDB_Clubhouse", 1);
        req.onupgradeneeded = e => { e.target.result.createObjectStore("dp_store"); };
        req.onsuccess = e => {
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
        req.onupgradeneeded = e => { e.target.result.createObjectStore("dp_store"); };
        req.onsuccess = e => {
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
    for (let d of dice) { count[d]++; sum += d; }

    if (cat < 6) return count[cat + 1] * (cat + 1); // Ones to Sixes
    if (cat === 6) return sum; // Choice

    if (cat === 7) { // 4 of a kind (アソビ大全は条件を満たせば「全ダイスの合計」)
        return count.some(c => c >= 4) ? sum : 0;
    }
    if (cat === 8) { // Full House (アソビ大全は「全ダイスの合計」)
        let has3 = count.some(c => c === 3);
        let has2 = count.some(c => c === 2);
        let has5 = count.some(c => c === 5);
        return (has5 || (has3 && has2)) ? sum : 0;
    }
    if (cat === 9) { // S.Straight (15点)
        let mask = 0;
        for (let i = 1; i <= 6; i++) if (count[i] > 0) mask |= (1 << i);
        if ((mask & 0b011110) === 0b011110) return 15;
        if ((mask & 0b111100) === 0b111100) return 15;
        if ((mask & 0b1111000) === 0b1111000) return 15;
        return 0;
    }
    if (cat === 10) { // L.Straight (30点)
        let mask = 0;
        for (let i = 1; i <= 6; i++) if (count[i] > 0) mask |= (1 << i);
        if ((mask & 0b0111110) === 0b0111110) return 30;
        if ((mask & 0b1111100) === 0b1111100) return 30;
        return 0;
    }
    if (cat === 11) { // Yacht (50点)
        return count.some(c => c === 5) ? 50 : 0;
    }
    return 0;
}

// --- メイン解析処理 ---
async function runYachtAnalysis() {
    output("データベースを確認中...");
    const cachedDP = await getDPFromDB();
    if (cachedDP) {
        output("\n✅ 過去の計算結果（IndexedDB）を読み込みました！");
        output(`💡 ヨットの完全な最大期待値: ${cachedDP[0].toFixed(5)} 点`);
        return;
    }

    output("初回の完全解析を実行します。（※PC性能により数十秒かかります）");
    const t0 = performance.now();

    // 1. ダイス（252通り）の生成
    const ALL_DICE = [];
    const DICE_TO_ID = {};
    function genDice(idx, cur) {
        if (cur.length === 5) {
            ALL_DICE.push([...cur]);
            DICE_TO_ID[cur.join("")] = ALL_DICE.length - 1;
            return;
        }
        for (let i = idx; i <= 6; i++) { cur.push(i); genDice(i, cur); cur.pop(); }
    }
    genDice(1, []);

    // 2. キープ状態（462通り）の生成
    const ALL_KEEPS = [];
    const KEEP_TO_ID = {};
    for (let len = 0; len <= 5; len++) {
        function genKeep(idx, cur) {
            if (cur.length === len) {
                ALL_KEEPS.push([...cur]);
                KEEP_TO_ID[cur.join("")] = ALL_KEEPS.length - 1;
                return;
            }
            for (let i = idx; i <= 6; i++) { cur.push(i); genKeep(i, cur); cur.pop(); }
        }
        genKeep(1, []);
    }
    const EMPTY_KID = KEEP_TO_ID[""]; // キープ0個（全振り直し）のID

    // 3. スコアテーブル構築
    const SCORE_TABLE = new Int32Array(252 * 12);
    for (let d = 0; d < 252; d++) {
        for (let c = 0; c < 12; c++) {
            SCORE_TABLE[d * 12 + c] = calcScore(c, ALL_DICE[d]);
        }
    }

    // 4. キープ状態 -> 振り直し結果の確率分布
    const K_START = new Int32Array(462 + 1);
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
                const arr = [...kept, ...cur].sort((a,b)=>a-b).join("");
                countMap[arr] = (countMap[arr] || 0) + 1;
                return;
            }
            for (let i = 1; i <= 6; i++) { cur.push(i); dfs(depth + 1, cur); cur.pop(); }
        }
        dfs(0, []);
        
        for (let key in countMap) {
            K_NEXT.push(DICE_TO_ID[key]);
            K_PROB.push(countMap[key] / denom);
            k_idx++;
        }
    }
    K_START[462] = k_idx;
    const K_PROB_F64 = new Float64Array(K_PROB);
    const K_NEXT_I32 = new Int32Array(K_NEXT);

    // 5. ダイス状態 -> 選択可能な全キープ状態（重複排除）
    const D_K_START = new Int32Array(252 + 1);
    const D_K_KID = [];
    let dk_idx = 0;
    for (let d = 0; d < 252; d++) {
        D_K_START[d] = dk_idx;
        const dice = ALL_DICE[d];
        const uniqueKids = new Set();
        for (let m = 0; m < 32; m++) {
            const kept = [];
            for (let i = 0; i < 5; i++) if (m & (1 << i)) kept.push(dice[i]);
            uniqueKids.add(KEEP_TO_ID[kept.sort((a,b)=>a-b).join("")]);
        }
        for (let kid of uniqueKids) { D_K_KID.push(kid); dk_idx++; }
    }
    D_K_START[252] = dk_idx;
    const D_K_KID_I32 = new Int32Array(D_K_KID);

    // === DP解析（愚直に全状態をループ） ===
    const DP = new Float64Array(4096 * 64);
    const evRoll0 = new Float64Array(252);
    const evRoll1 = new Float64Array(252);
    const evRoll2 = new Float64Array(252);
    const evKeep1 = new Float64Array(462);
    const evKeep2 = new Float64Array(462);

    const maskByBits = Array.from({ length: 13 }, () => []);
    for (let m = 0; m < 4096; m++) {
        let b = 0, tmp = m;
        while (tmp > 0) { b += tmp & 1; tmp >>= 1; }
        maskByBits[b].push(m);
    }

    // 11枠埋め -> 0枠埋め（逆順DP）
    for (let bits = 11; bits >= 0; bits--) {
        const masks = maskByBits[bits];
        
        for (let mIdx = 0; mIdx < masks.length; mIdx++) {
            const mask = masks[mIdx];
            
            // 処理が重いため、10マスクごとに画面描画を更新してフリーズを防ぐ
            if (mIdx % 10 === 0) await new Promise(r => setTimeout(r, 0));

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
    output("✅ DBへの保存が完了しました！ 次回からは一瞬で呼び出せます。");
}

// 実行
runYachtAnalysis();