const electron = require('electron');
// Module to control application life.
const app = electron.app;
const sql = require("mssql");

// Module ipc for inter-process communication
const ipcMain = require('electron').ipcMain;

// get db config
const Config = require('config-js');
const config = new Config('./config/config.js');


const jsconn = require('./js/connfuncs.js');
const jsbatch = require('./js/batchfuncs.js');
const jsinvoice = require('./js/invoicefuncs.js');
const jsorder = require('./js/orderfuncs.js');
const jsfs = require('./js/fsfuncs.js');
const { json } = require('express');
const jssqlConn = require('./js/sqlconnect.js');

// global shared object
global.sharedObj = {
    tempFile: null,
    platformOS: null,
    sessionKey: 0,
    sqlConn: sql,
    sqlConfig: null,
    sqlConnState: null,
    sqlAuthType: null,
    okToShutdown: false,
    serverAddress: null,
    dbName: null,
    userName: null,
    userPswd: null,
    authType: null,
    dbDriver: "tedious",
    dbList: []
  };



// pre-populate server and db if configured
if (config.get("serverAddress")) {
  global.sharedObj.serverAddress = config.get("serverAddress");
  global.sharedObj.dbName = config.get("dbName");
  global.sharedObj.userName = config.get("userID");
  global.sharedObj.userPswd = config.get("userPswd");
  global.sharedObj.authType = "S";
  global.sharedObj.sqlConnState = jssqlConn.sqlConn();
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//app.on('ready', createWindow);
app.on('ready', function() {
    jsbatch.sendBatch({}, '000015867', 'A');
    app.quit();
    // createExtraWindows()
  });
  
  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  });
  

