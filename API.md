# Yacht Solver API

このドキュメントは `solver.js` で提供される API の使い方をまとめたものです。

## 概要

`solver.js` は Yacht の最適戦略を提供する純粋なソルバ API です。
- UI 層は `dice` / `usedMask` / `upperSum` / `rollsLeft` を渡す
- ソルバは最適な行動を返す
- `init()` で DP キャッシュを読み込み／初期化する

## 利用方法

### 1. 初期化

```html
<script src="./solver.js"></script>
<script>
  // 進捗コールバックを受け取る例
  await YachtSolver.init({
    onProgress: ({ completedSlots, totalSlots, elapsedSeconds }) => {
      // completedSlots: 0..12（12は完了）
      console.log(`解析進捗: ${completedSlots}/${totalSlots} (経過 ${elapsedSeconds.toFixed(1)}s)`);
    }
  });
  console.log(YachtSolver.isReady());
</script>
```

`init(options)` は IndexedDB から事前計算済み DP を読み込みます。保存がない場合は完全解析を実行して DB に保存します。`options.onProgress` が指定された場合、12段階の進捗（`completedSlots`）と経過秒数がループごとに呼ばれます。

戻り値（Promise）: 初期化が完了するとオブジェクトを返します。例:

```js
// 例: { dpReady: true, loadedFromDB: false, timeSeconds: 42.3 }
const info = await YachtSolver.init({ onProgress: cb });
```

フィールド:
- `dpReady`: boolean
- `loadedFromDB`: boolean（既存 DB から読み込めたか）
- `timeSeconds`: 全計算にかかった時間（DBから読み込んだ場合は 0）

### 2. 準備完了確認

```js
if (!YachtSolver.isReady()) {
  await YachtSolver.init();
}
```

## API 詳細

### `YachtSolver.getBestAction(params)`

最適な次の行動を返します。

#### 引数

- `dice: number[]` — 5個のダイス値。例: `[1,2,3,4,5]`
- `usedMask?: number` — 12役をビットで表した使用済みマスク。未指定は `0`。
- `upperSum?: number` — 上段合計。未指定は `0`。
- `rollsLeft?: number` — 残り振り直し回数。0〜2。未指定は `2`。
- `accumulatedScore?: number` — UI が既に確定している合計得点（全カテゴリの合計）。未指定は `0`。

#### 返り値

- `actionType: "keep" | "terminal"`
- `keepMask?: string` — 5桁のキープマスク。例: `"11010"`
- `keepPositions?: number[]` — 保持するダイス位置。例: `[1,2,4]`
- `keepValues?: number[]` — 保持するダイス値。例: `[1,1,4]`
- `rerollPositions?: number[]` — 振り直す位置。例: `[3,5]`
- `futureExpected: number` — これから先（未確定のターン）の期待値
- `totalExpected: number` — `accumulatedScore + futureExpected`（全体の総期待値）
- `categoryIndex?: number` — 最終ロール時の記入先カテゴリ番号（terminal の場合）
- `categoryName?: string` — 最終ロール時のカテゴリ表示名（terminal の場合）
- `score?: number` — 最終ロール時の該当カテゴリ得点（terminal の場合）
- `nextUpperSum?: number` — 記入後の上段合計（terminal 時）

#### 動作方針

- `rollsLeft === 0` の場合は強制的に `terminal` を返します。
- `rollsLeft > 0` の場合は、ソルバは「振り直しを行って最適化する (`keep`)」場合の期待値と「今すぐ記入する (`terminal`)」場合の期待値の両方を評価して、期待値が高い方のアクションを返します。

#### 例

```js
const result = YachtSolver.getBestAction({
  dice: [1, 2, 3, 4, 5],
  usedMask: 0,
  upperSum: 0,
  rollsLeft: 2,
  accumulatedScore: 12 // 既に得ている合計点
});

if (result.actionType === "keep") {
  console.log('Keep', result.keepMask, result.futureExpected, result.totalExpected);
} else {
  console.log('Terminal', result.categoryName, result.score, result.futureExpected, result.totalExpected);
}
```

### `YachtSolver.getCategoryScore(category, dice)`

指定カテゴリの得点を計算します。

#### 引数

- `category: number` — 0〜11 のカテゴリ番号
- `dice: number[]` — 5個のダイス値

#### 例

```js
const score = YachtSolver.getCategoryScore(6, [1,2,3,4,5]);
console.log(score); // 15
```

### `YachtSolver.getDiceId(dice)`

ソルバ内部のダイス ID を取得します。

#### 例

```js
const diceId = YachtSolver.getDiceId([1,2,3,4,5]);
```

### `YachtSolver.getCategoryDisplay()`

12カテゴリの表示名リストを取得します。

#### 例

```js
const names = YachtSolver.getCategoryDisplay();
```

## 状態管理の考え方

UI 側で管理すべき状態:

- `dice`: 直近の振り直し後のダイス配列
- `usedMask`: すでに記入済みのカテゴリマスク
- `upperSum`: 上段の合計点
- `rollsLeft`: 次の入力での残り振り直し回数

`solver.js` は状態を管理しません。UI は必要な値を計算して `getBestAction()` に渡してください。

## 例: ターンフロー

1. `new game` で `usedMask=0, upperSum=0, rollsLeft=2` を開始
2. `dice` を入力
3. `YachtSolver.getBestAction({...})` を呼ぶ
4. `keepMask` に基づき保持位置と振り直し位置を決定
5. 残り振り直しを更新して再度呼ぶ
6. `rollsLeft===0` なら `terminal` 結果として記入先を取得

## エラー条件

- `init()` を呼ぶ前に `getBestAction()` を呼ぶと例外
- `dice` が 5要素でない、または 1〜6 以外の値が含まれると例外
- `usedMask` が 0〜4095 でない場合例外
- `upperSum` が 0〜63 でない場合例外
- `rollsLeft` が 0〜2 でない場合例外
