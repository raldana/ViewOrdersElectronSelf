'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

/*
// for dev: auto re-loading when source code changes
require('electron-reload')(__dirname, {
  ignored: '*.pdf'
});
*/

// Module ipc for inter-process communication
const ipcMain = require('electron').ipcMain;

var isDone = false;

// config
var Config = require('config-js');
var config = new Config('./config/config.js');


// javascript files
var jsconn = require('./js/connfuncs.js');
var jsbatch = require('./js/batchfuncs.js');
var jsinvoice = require('./js/invoicefuncs.js');
var jsorder = require('./js/orderfuncs.js');
var jsfs = require('./js/fsfuncs.js');
var jsindex = require('./js/index.js');

// global shared object
global.sharedObj = {
    tempFile: null,
    platformOS: null,
    sessionKey: 0,
    sqlConfig: null,
    sqlAuthType: null,
    okToShutdown: false
  };

// get process platform
const platformOS = process.platform;
const osVersion = require('os').release();
const envVersion = process.version;
console.log('startup: ' + Date.now());
console.log('OS:' + platformOS + ', version: ' + osVersion);
console.log('NodeJS version: ' + envVersion);
console.log('------------------------------' + '\n');
global.sharedObj.platformOS = platformOS;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let configWindow;
let jobWindow;

function createWindow () {
  // Create the order window.
  mainWindow = new BrowserWindow({width: 1024, height: 768});
  
  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  mainWindow.on('close', function () {
    // close the config and job windows
    if (configWindow) {
      configWindow.close();
    }

    if (jobWindow) {
      jobWindow.close();
    }

    // delete any temp files we created
    var tmpFile = global.sharedObj.tempFile
    if (tmpFile) {
        jsfs.deleteFile(null, tmpFile);
    };
    console.log("shutting down..." + "\n");
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

function createExtraWindows() {
  // Create the configs window.
  configWindow = new BrowserWindow({width: 500, height: 400});
  //configWindow.setMenu(null);

  // Create the jobs window.
  jobWindow = new BrowserWindow({width: 500, height: 500});
  //jobWindow.setMenu(null);

  // and load the config.html of the app.
  configWindow.loadURL(`file://${__dirname}/config.html`);

  // and load the job.html of the app.
  jobWindow.loadURL(`file://${__dirname}/job.html`);

  // Emitted when the window is closed.
  configWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    configWindow = null;
  });

  // Emitted when the window is closed.
  jobWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    jobWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//app.on('ready', createWindow);
app.on('ready', function() {
  createWindow()
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

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// send batch
ipcMain.on('sendBatch', function(event, orderNumber, orderType, config) {
  jsbatch.sendBatch(event, orderNumber, orderType, config);
});

// test sql connection
ipcMain.on('testConn', function(event, config) {
  jsconn.testConn(config, event);   // js/connfuncs.js
  // jsconn.testConnV8(config, event);   // js/connfuncs.js
});

// get order file name
ipcMain.on('getOrderViewFileName', function(event, config, orderNumber, orderType) {
  if (orderType == 'A' || orderType == 'O') {
    jsinvoice.getInvoiceFileName(event, config, orderNumber);
  } else {
    jsorder.getOrderFileName(event, config, orderNumber, orderType);
  };
  
});

// debug console function for use by renderer processes
ipcMain.on('consoleLog', function(event, msg) {
  console.log(msg);
});

// check if file exists
ipcMain.on('fileExists', function (event, fname) {
  jsfs.fileExists(event, fname);
});


// watch for file
ipcMain.on('watchFile', function (event, fname) {
  jsfs.watchFile(event, fname);
});

// copy file
ipcMain.on('copyFile', function (event, sourceFile, targetFile) {
  jsfs.copyFile(event, sourceFile, targetFile);
});

// delete file
ipcMain.on('deleteFile', function (event, targetFile) {
  jsfs.deleteFile(event, targetFile);
});

// update global temp file name
ipcMain.on('updateTempFileName', function (event, tempFile) {
  var newFile = __dirname + '\\pdf.js\\web\\' + require('path').basename(tempFile);
  global.sharedObj.tempFile = newFile;
});

// update global temp file name
ipcMain.on('updateSessionKey', function (event, sessionKey) {
  global.sharedObj.sessionKey = sessionKey;
  console.log('Session Key is: ' + sessionKey + '\n');
});

// check if order number is valid
ipcMain.on('checkForValidOrder', function (event, orderNumber, orderType, config) {
  jsinvoice.checkForValidOrder(event, orderNumber, orderType, config)
});
