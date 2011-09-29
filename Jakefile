var childProcess = require("child_process");

desc("Run the test suite");
task("test", [], function() {
  var process = childProcess.spawn("test/run", [], { customFds: [0, 1, 2] });
  process.on("exit", function() { complete(); });
}, true);

desc("Run JSHint");
task("hint", [], function() {
  var process = childProcess.spawn(
    "jshint",
    [
      "lib/codie.js",
      "test/codie-test.js",
      "test/run",
      "Jakefile"
    ],
    { customFds: [0, 1, 2] }
  );
  process.on("exit", function() { complete(); });
}, true);

task("default", ["test"], function() {});
