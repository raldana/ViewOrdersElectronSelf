'use strict';
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const sql = require("mssql");
/*
// for dev: auto re-loading when source code changes
require('electron-reload')(__dirname, {
  ignored: '*.pdf'
});
*/

// Module ipc for inter-process communication
const ipcMain = require('electron').ipcMain;

// misc
const path = require("path");

let isDone = false;

// get db config
const Config = require('config-js');
const config = new Config('./config/config.js');

// javascript files
const jsconn = require('./js/connfuncs.js');
const jsbatch = require('./js/batchfuncs.js');
const jsinvoice = require('./js/invoicefuncs.js');
const jsorder = require('./js/orderfuncs.js');
const jsfs = require('./js/fsfuncs.js');
const { json } = require('express');
const jssqlConn = require('./js/sqlconnect.js');
const jsjobSubmitted = require('./js/jobSubmitted.js');
const jsjlogFuncs = require('./js/logFuncs.js');

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
    sqlServerAddress: null,
    dbName: null,
    userName: null,
    userPswd: null,
    authType: null,
    dbDriver: "tedious",
    docOriginServerAddress: null,
    connectionTimeOut: 30000,
    waitingForFile: false,
    orderNumber: null,
    connectEncrypt: true,
    iFrameHeight: null,
    iFrameWidth: null,
    iFrameTop: null,
    iFrameLeft: null,
    dbList: []
  };



// pre-populate server and db if configured
if (config.get("sqlServerAddress")) {
  global.sharedObj.sqlServerAddress = config.get("sqlServerAddress");
  global.sharedObj.dbName = config.get("dbName");
  global.sharedObj.userName = config.get("userID");
  global.sharedObj.userPswd = config.get("userPswd");
  global.sharedObj.docOriginServerAddress = config.get("docOriginServerAddress");
  global.sharedObj.connectionTimeOut = config.get("connectionTimeOut");
  global.sharedObj.authType = "S";
  global.sharedObj.connectEncrypt = config.get("encrypt");
  global.sharedObj.sqlConnState = jssqlConn.sqlConn();
}

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
let jobSubmittedWindow;

function createWindow () {
  // Create the order window.
  mainWindow = new BrowserWindow(
    { width: 1024, 
      height: 768,
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true, 
        contextIsolation: false,
        preload: path.join(__dirname, "preload.js"),
        plugins: true
      }
    }
  );
  
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

    if (jobSubmittedWindow) {
      jobSubmittedWindow.close();
    }

    // delete any temp files we created
    var tmpFile = global.sharedObj.tempFile
    if (tmpFile) {
        jsfs.deleteFile(null, tmpFile);
    };

    // shutdown the file watcher
    if (jsfs.watcher) {
      if (jsfs.watcher.watchFile) {
        console.log("closing file watchers..." + "\n");
        jsfs.watcher.watchFile.close();
      }
    }

    // let us know we are shutting down
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

function createJobSubmittedWindow(orderNumber) {
  // Create the job submitted window.
  let winBounds = mainWindow.getContentBounds();
  console.log("windBounds: " + JSON.stringify(winBounds));
  let winHeight = winBounds.height;
  let winWidth = winBounds.weight;
  jobSubmittedWindow = new BrowserWindow(
    { parent: mainWindow,
      modal: false,
      //width: mainWindow.clientWidth, 
      //height: 768, //mainWindow.offsetHeight,
      center: false,
      //x: mainWindow.left, //global.sharedObj.frameLeft,
      //y: global.sharedObj.frameTop,
      show: false,
      frame: false,
      useContentSize: true,
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
        worldSafeExecuteJavaScript: true, 
        contextIsolation: false,
        preload: path.join(__dirname, "preload.js"),
        plugins: true,
        v8CacheOptions: "none"
      }
    }
  );
  //jobSubmittedWindow.setMenu(null);

  // and load the job.html of the app.
  jobSubmittedWindow.loadURL(`file://${__dirname}/jobSubmitted.html`);
  
  jobSubmittedWindow.once("ready-to-show", () => {
    let winBounds = mainWindow.getContentBounds();
    jobSubmittedWindow.setSize(winBounds.width-250-15, winBounds.height-20);
    jobSubmittedWindow.setPosition(winBounds.x+250, winBounds.y);
    jobSubmittedWindow.show();
  })

  // Emitted when the window is closed.
  jobSubmittedWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    jobSubmittedWindow = null;
  });
}

function closeJobSubmittedWindow() {
  if (jobSubmittedWindow) {
    jobSubmittedWindow.close();
  }
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

function fillGlobalDBList(dbList) {
  global.sharedObj.dbList = dbList;
  console.log("global DB List: " + JSON.stringify(global.sharedObj.dbList));
}


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// send batch
ipcMain.on('sendBatch', function(event, orderNumber, orderType, config) {
  console.log("main.js -on SendBatch: sending order number = " + orderNumber + " , order type = " + orderType);
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
  console.log("main.copyFile - source = " + sourceFile + " , targetFile = " + targetFile);
  jsfs.copyFile(event, sourceFile, targetFile);
});

// delete file
ipcMain.on('deleteFile', function (event, targetFile) {
  jsfs.deleteFile(event, targetFile);
});

// update global temp file name
ipcMain.on('updateTempFileName', function (event, tempFile) {
  //var newFile = __dirname + '\\web\\' + require('path').basename(tempFile);
  //global.sharedObj.tempFile = newFile;
  global.sharedObj.tempFile = tempFile;
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

// populate db selector
ipcMain.on('populateDBSelector', function (event, config) {
  jsconn.getDBList(event, config);
})

// update global db list
ipcMain.on("fillGlobalDBList", function(event, dbList) {
  console.log(dbList);
  fillGlobalDBList(dbList);
})

// show job submitted modal
ipcMain.on("showJobSubmitted", function(event) {
  createJobSubmittedWindow();
})

// show job submitted modal
ipcMain.on("closeJobSubmittedWindow", function(event) {
  closeJobSubmittedWindow();
})

// show console log statements to browser windows
//ipcMain.on("consoleLogThis", function(event, logMessage) {
//  jsjlogFuncs.logThis(event, logMessage);
//})

// set frame dimensions
ipcMain.on("setFrameDimensions", function(event, frameHeight, frameWidth, frameTop, frameLeft) {
  global.sharedObj.iFrameHeight = frameHeight;
  global.sharedObj.iFrameWidth = frameWidth;
  global.sharedObj.iFrameTop = frameTop;
  global.sharedObj.iFrameLeft = frameLeft;
  console.log("frame height: " + frameHeight + 
      ", width: " + frameWidth + ", top: " + frameTop + ", left: " + frameLeft);
  //createJobSubmittedWindow();
})

// cancel current job
ipcMain.on("cancelJob", function(event) {
  jsjobSubmitted.cancelJob();
  closeJobSubmittedWindow();
})