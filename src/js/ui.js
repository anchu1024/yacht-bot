const consoleBody = document.querySelector("#console-main");

const COLORS = {
    // Normal
    black: "#011627",
    red: "#EF5350",
    green: "#22DA6E",
    yellow: "#c5e478",
    blue: "#82AAFF",
    purple: "#C792EA",
    cyan: "#21C7A8",
    white: "#FFFFFF",
    // Bright
    brightBlack: "#575656",
    brightRed: "#EF5350",
    brightGreen: "#22DA6E",
    brightYellow: "#FFEB95",
    brightBlue: "#82AAFF",
    brightPurple: "#C792EA",
    brightCyan: "#7FDBCA",
    brightWhite: "#FFFFFF",
    // ui
    background: "#011627",
    foreground: "#D6DEEB",
    cursor: "#80a4c2",
    selection: "#1d3b53",
};

function parse(str) {
    // 1. 最初に環境依存の「¥」をすべて「\」に統一（これで誤判定の芽を摘みます）
    let normalized = str.replaceAll("¥", "\\");

    // 2. 正規表現も「\」だけに特化させてシンプルに
    const tag = /(?<!\\)\[((?:\\.|[^\]])*?)(?<!\\)\]/g;

    // タグを HTML に置換
    let result = normalized.replace(tag, (match, ctx) => {
        if (!ctx) return;
        if (ctx.startsWith("bg-")) {
            ctx = ctx.replace("bg-", "");
            if (Object.hasOwn(COLORS, ctx)) return `<span style="background-color:${COLORS[ctx]};">`;
        }
        if (Object.hasOwn(COLORS, ctx)) return `<span style="color:${COLORS[ctx]};">`;
        if (ctx === "bold") return `<span style="font-weight:bold;">`;
        if (ctx === "italic") return `<span style="font-style:italic;">`;
        if (ctx === "/") return `</span>`;
        return `<span>`;
    });

    // 3. 最後にエスケープ用の「\」を綺麗にお掃除
    const escape = /\\([\[\]])/g;
    return result.replace(escape, "$1");
}

function log(str) {
    const formalized = "[blue]Bot>[/] " + str;
    const parsed = parse(formalized);
    const element = document.createElement("div");
    element.innerHTML = parsed;
    consoleBody.appendChild(element);
}

log("hello world! こんにちは世界!");
