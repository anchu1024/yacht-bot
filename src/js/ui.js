const ELEMENT = {
    console: document.querySelector("#console-main"),
    output: document.querySelector("#output-display"),
    inputBox: document.querySelector("#input-box"),
    input: document.querySelector("#user-input"),
    cursor: document.querySelector(".cursor"),
};

const STAT = {
    inputEnable: false,
    userInputPromise: null,
    mode: null,
};

const META = {
    version: "v1.0.0",
    build: "2026-08-14",
    author: "X+C Core",
    jsRequirement: "ES2022+",
    browserRequirements: {
        chrome: "92+",
        edge: "92+",
        firefox: "92+",
        safari: "15.4+",
    },
};

const INIT_SETTINGS = {
    guideEnable: true,
};

const LOCKED_SETTINGS = [];

let SETTINGS = deepcopy(INIT_SETTINGS);

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
    transparent: "#00000000",
};

function parse(str) {
    // 1. 最初に環境依存の「¥」をすべて「\\」に統一
    let normalized = str.replaceAll("¥", "\\");
    let result = "";
    let openTags = [];

    for (let i = 0; i < normalized.length; i += 1) {
        const char = normalized[i];

        // エスケープされた括弧はそのまま表示する
        if (char === "\\" && i + 1 < normalized.length) {
            const next = normalized[i + 1];
            if (next === "[" || next === "]") {
                result += next;
                i += 1;
                continue;
            }
        }

        if (char === "[") {
            const end = normalized.indexOf("]", i + 1);
            if (end !== -1) {
                const inner = normalized.slice(i + 1, end);

                if (inner === "/") {
                    if (openTags.length > 0) {
                        openTags.pop();
                        result += "</span>";
                    } else {
                        result += "[/]";
                    }
                    i = end;
                    continue;
                }

                let style = "";
                let isKnownTag = false;

                if (inner.startsWith("bg-")) {
                    const colorName = inner.slice(3);
                    if (Object.hasOwn(COLORS, colorName)) {
                        style = `background-color:${COLORS[colorName]};`;
                        isKnownTag = true;
                    }
                }

                if (!isKnownTag && Object.hasOwn(COLORS, inner)) {
                    style = `color:${COLORS[inner]};`;
                    isKnownTag = true;
                }

                if (!isKnownTag && inner === "bold") {
                    style = "font-weight:bold;";
                    isKnownTag = true;
                }

                if (!isKnownTag && inner === "italic") {
                    style = "font-style:italic;";
                    isKnownTag = true;
                }

                if (isKnownTag) {
                    openTags.push(style);
                    result += `<span style="${style}">`;
                    i = end;
                    continue;
                }
            }
        }

        result += char;
    }

    return result;
}

function log(str, { pref = true, escape = true } = {}) {
    const formalized = (pref ? "[blue]Bot>[/] " : "") + str;
    const escaped = escape ? escapeHtml(formalized) : formalized;
    const parsed = parse(escaped);
    const element = document.createElement("div");
    element.innerHTML = parsed.replace(/\r?\n/g, "<br>");
    element.classList.add("log");
    ELEMENT.output.appendChild(element);
    requestAnimationFrame(() => {
        ELEMENT.console.scrollTop = ELEMENT.console.scrollHeight;
    });
}

function emptyLine() {
    log("[transparent]a[/]", { pref: false });
}

function logo() {
    // どでかYacht BotをTiny5で描画
    const el = document.createElement("div");
    el.innerHTML = `<span style="font-family: 'Tiny5', 'Courier New', Courier; font-weight: bold; font-size: 50px;">Yacht Bot</span> ${META.version}`;
    ELEMENT.output.appendChild(el);
}

function kill(silent = false) {
    if (silent) throw new Error("process killed (silent)");
    throw new Error("process killed");
}

async function input() {
    const res = await userInput();
    if (res === "stop") {
        kill();
    }
    return res;
}

function userInput() {
    STAT.inputEnable = true;
    ELEMENT.inputBox.dataset.enable = true;
    return new Promise((resolve, reject) => {
        STAT.userInputPromise = resolve;
    });
}

/**
 * 文字列・値のハイライト処理
 */
function syntaxHighlight(str) {
    if (typeof str === "object") str = JSON.stringify(str);
    else if (typeof str !== "string") str = String(str);

    // クォートで囲まれた文字列
    if (/^["'].*["']$/.test(str)) {
        return `<span style="color: ${COLORS.purple};">${escapeHtml(str)}</span>`;
    }

    if (/^true|false|null$/.test(str)) {
        return `<span style="color: ${COLORS.red};">${escapeHtml(str)}</span>`;
    }

    if (str === "undefined") {
        return `<span style="color: ${COLORS.blue};">${escapeHtml(str)}</span>`;
    }

    if (!Number.isNaN(Number(str))) {
        return `<span style="color: ${COLORS.green};">${escapeHtml(str)}</span>`;
    }

    // 通常の引数や数値
    return escapeHtml(str);
}

/**
 * ターミナル入力のパーサー（スペース保持版）
 */
function parseInput(str) {
    if (str == null) return "";

    // トークン単位に分割する正規表現
    // 1. ダブルクォート文字列
    // 2. シングルクォート文字列
    // 3. オプション (--flag, -f, --key="val" など)
    // 4. 行末コメント (// ..., # ...)
    // 5. 空白文字の連続 (\s+)
    // 6. その他の単語 (\S+)
    const tokenRegex =
        /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--?[a-zA-Z0-9-]+(?:=(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+))?|\/\/.*$|#.*$|\s+|\S+/g;

    const tokens = str.match(tokenRegex);
    if (!tokens) return escapeHtml(str);

    let isFirstToken = true;

    const highlightedTokens = tokens.map((token) => {
        // 空白文字（スペースやタブ等）はそのまま返す（コマンド判定も進めない）
        if (/^\s+$/.test(token)) {
            return token;
        }

        // コメント処理
        if (token.startsWith("//") || token.startsWith("#")) {
            return `<span style="color: ${COLORS.brightBlack};">${escapeHtml(token)}</span>`;
        }

        // 先頭の非空白単語（コマンド名）
        if (isFirstToken) {
            isFirstToken = false;
            return `<span style="color: ${COLORS.brightYellow};">${escapeHtml(token)}</span>`;
        }

        // オプション (--option, -o, --key=value)
        if (token.startsWith("-")) {
            if (token.includes("=")) {
                const [opt, ...valParts] = token.split("=");
                const val = valParts.join("=");
                return `<span style="color: ${COLORS.brightBlack};">${escapeHtml(opt)}</span>=` + syntaxHighlight(val);
            }
            return `<span style="color: ${COLORS.brightBlack};">${escapeHtml(token)}</span>`;
        }

        // その他の引数またはクォート文字列
        return syntaxHighlight(token);
    });

    // 区切り文字なしでそのまま結合することで元の空白構造を完全維持
    return highlightedTokens.join("");
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

document.addEventListener("keydown", (e) => {
    if (!STAT.inputEnable) return;

    if (e.ctrlKey) return;

    const key = e.key;
    if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 126) {
        ELEMENT.input.textContent += key;
    }

    if (key === "Space") {
        ELEMENT.input.textContent += " ";
    }

    if (key === "Backspace") {
        ELEMENT.input.textContent = ELEMENT.input.textContent.slice(0, -1);
    }

    if (key === "Tab") {
        e.preventDefault();
        ELEMENT.input.textContent += "    ";
    }

    if (key === "Enter") {
        if (!STAT.userInputPromise) return;
        const res = ELEMENT.input.textContent.trim();
        STAT.userInputPromise(res);
        ELEMENT.input.textContent = "";
        STAT.inputEnable = false;
        ELEMENT.inputBox.dataset.enable = false;
        log(`${escapeHtml(">")} ${parseInput(res)}`, { pref: false, escape: false });
    }

    ELEMENT.input.innerHTML = parseInput(ELEMENT.input.textContent);
});
