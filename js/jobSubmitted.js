  // see: https://github.com/microsoft/TypeScript/issues/30718#issuecomment-479609634
  //var exports = {};
const ipcRenderer = require('electron').ipcRenderer;

const cancelJob = function() {
  ipcRenderer.send("consoleLog", "canceling job...");
  ipcRenderer.send("cancelJob");
}

exports.cancelJob = cancelJob;