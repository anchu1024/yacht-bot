class Dialog {
    constructor(str, pref = true, escape = true) {
        this.str = str;
        this.pref = pref;
        this.escape = escape;
    }

    get() {
        return this.str;
    }

    log(...arg) {
        let str = this.str;
        for (let i = 0; i < arg.length; i++) {
            const name = "$" + String(i + 1);
            str = str.replace(name, arg[i]);
        }
        log(str, { pref: this.pref, escape: this.escape });
    }
}
