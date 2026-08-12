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
};

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

function log(str, noPref = false) {
    const formalized = (noPref ? "" : "[blue]Bot>[/] ") + str.trim();
    const escaped = formalized
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const parsed = parse(escaped);
    const element = document.createElement("div");
    element.innerHTML = parsed.replace(/\r?\n/g, "<br>");
    element.classList.add("log");
    ELEMENT.output.appendChild(element);
}

function logo() {
    // どでかYacht BotをTiny5で描画
    const el = document.createElement("div");
    el.innerHTML = `<span style="font-family: 'Tiny5', 'Courier New', Courier; font-weight: bold; font-size: 50px;">Yacht Bot</span>`;
    ELEMENT.output.appendChild(el);
}

function userInput() {
    STAT.inputEnable = true;
    ELEMENT.inputBox.dataset.enable = true;
    return new Promise((resolve, reject) => {
        STAT.userInputPromise = resolve;
    });
}

document.addEventListener("keydown", (e) => {
    if (!STAT.inputEnable) return;

    if (e.ctrlKey) return;

    const key = e.key;
    if (key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 126) {
        ELEMENT.input.textContent += key;
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
        userInputPromise(ELEMENT.input.textContent);
        ELEMENT.input.textContent = "";
        STAT.inputEnable = false;
        ELEMENT.inputBox.dataset.enable = false;
    }
});
