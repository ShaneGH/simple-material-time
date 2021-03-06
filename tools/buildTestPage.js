const fs = require("fs");
const path = require("path");
const walk = require('fs-walker');

function mochaUrl (mochaFile) {
    return "file:///" + path.resolve(__dirname, "../node_modules/mocha/", mochaFile).replace(/\\/g, "/");
}

function chaiUrl (mochaFile) {
    return "file:///" + path.resolve(__dirname, "../node_modules/chai/", mochaFile).replace(/\\/g, "/");
}

var files = [];    
var unitTests = path.resolve(__dirname, "../testBin/unitTests");
if (fs.existsSync(unitTests)) {
  files = files.concat(
    walk.sync(
      unitTests, 
      stats => !/\.js$/.test(stats.name)));
}

files = files.map(x => x.fullname.replace(/\\/g, "/").replace(/^.+?testBin\//i, "./"))

var page = `<html>
  <head>
    <title>Material time tests</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${mochaUrl("mocha.css")}" />
  </head>
  <body>
    <script src="${mochaUrl("mocha.js")}"></script>
    <script src="${chaiUrl("chai.js")}"></script>
    <script src="file:///${path.resolve(__dirname, "../node_modules/requirejs/require.js").replace(/\\/g, "/")}"></script>

    <div>Test page generated using ${__filename}</div>

    <div id="mocha"></div>
    
    <script>
      chai.should();
      mocha.setup("bdd");

      require([
        ${files.map(x => `"${x}"`).join(",\n        ")}], function() {

          mocha.run();
        });
    </script>
  </body>
</html>`;

var testBin = path.resolve(__dirname, "../testBin");
if (!fs.existsSync(testBin)){
  fs.mkdirSync(testBin);
}

fs.writeFileSync(path.resolve(testBin, "unitTest.html"), page);