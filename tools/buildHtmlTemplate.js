const path = require('path');
const readline = require('readline');
const fs = require('fs');

var reader = readline.createInterface({
    input: fs.createReadStream(path.resolve("./src/template.html"))
});

var lines = [];
reader.on("line", line => {
    lines.push(line
        .replace(/^\s*/g, "")
        .replace(/"/g, "\\\""));
});

function jsFile() {
    return [
        "// This is an auto-generated file, built with ./tools/buildHtmlTemplate.js",
        "",
        `var template = "${lines.join("")}";`,
        "",
        "var el = document.createElement('div');",
        "el.innerHTML = template;",
        "var innerTemplate = (<HTMLElement>el.childNodes[0]).innerHTML;",
        "",
        "function create() {",
        "    var el = document.createElement('div');",
        "    el.innerHTML = template;",
        "",
        "    return <HTMLElement>el.firstChild;",
        "}",
        "",
        "function append(el: HTMLElement) {",
        "    el.innerHTML = innerTemplate;",
        "    el.classList.add(\"facc-clock-container\");",
        " ",
        "    return el;",
        "}",
        "",
        "export { ",
        "    create,",
        "    append",
        "}"
    ].join("\n");
}

reader.on("close", () => fs.writeFileSync(path.resolve("./src/template.ts"), jsFile()));