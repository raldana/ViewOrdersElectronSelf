const remote = require('electron').remote;
const ipcRenderer = require('electron').ipcRenderer;
let isFileDone = false;
let dbConnectState = false;

// connect to db if config is available
function dbConnectFromConfig() {
    let servAddr = remote.getGlobal("sharedObj").serverAddress;
    let dbName = remote.getGlobal("sharedObj").dbName;
    let userName = remote.getGlobal("sharedObj").userName;
    let userPswd = remote.getGlobal("sharedObj").userPswd;
    if (remote.getGlobal("sharedObj").serverAddress) {
        document.getElementById("loginServerAddr").setAttribute("data-value",servAddr);
        document.getElementById("loginDBName").setAttribute("data-value",dbName);
        document.getElementById("loginUserID").setAttribute("data-value",userName);
        document.getElementById("loginUserPswd").setAttribute("data-value",userPswd);
        document.getElementById("loginAuthType").setAttribute("data-value", "S");

        document.getElementById("serverAddrText").value = servAddr;
        document.getElementById("dbSelector").value = dbName;

        let config = buildConfig();
        ipcRenderer.send("testConn", config)
    }
}

// connect to db
function connectToDB () {
    ipcRenderer.send("consoleLog","connecting to db");
    // get the server address
    var myServerAddr = document.getElementById("serverAddrText").value;
    
    // update the text for the db connect modal
    document.getElementById("serverAddrLabel").innerHTML = myServerAddr;
    
    // save to document properties
    document.getElementById("loginServerAddr").setAttribute("data-value", myServerAddr);
};

// save the db config object (server name, db, etc.)
function saveConfig () {
    ipcRenderer.send("consoleLog", "saveConfig()");
    // get the auth type (Windows or SQL Server)
    var authType = document.getElementById("loginAuthType").getAttribute("data-value");
    // ipcRenderer.send('consoleLog', "saveConfig() login auth type: " + loginAuthType);
    
    // get the user and password
    var myUserName = document.getElementById("userNameText").value;
    var myPasswordText = document.getElementById("userPswdText").value;

    document.getElementById("loginUserID").setAttribute("data-value", myUserName);
    document.getElementById("loginUserPswd").setAttribute("data-value", myPasswordText);
    document.getElementById("loginAuthType").setAttribute("data-value", authType);

    testConn(authType);
};

function testConn (loginAuthType) {
    ipcRenderer.send("consoleLog","testConn (index.js)");
    var config = buildConfig();
    var myStatus = document.getElementById("connStatusText");
    ipcRenderer.send("consoleLog", "config: " + JSON.stringify(config));

    if (loginAuthType == "W" || (config.user && config.password && config.server && config.database)) {
        ipcRenderer.send('testConn', config);
    };
    
    ipcRenderer.once('testConnReply', function(event, connectState) {
        dbConnectState = connectState;
        if (connectState == true) {
            // change the connect status text/color
            myStatus.style.color = "green";
            myStatus.innerHTML = "Connected";
            document.getElementById("connectButton").innerHTML = "Disconnect";
            ipcRenderer.send('populateDBSelector', config);
        } else {
            // change the connect status text/color
            myStatus.style.color = "red";
            myStatus.innerHTML = "Connect failed";
            document.getElementById("connectButton").innerHTML = "Connect";
        };
    });

};

function isEmpty(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
};

function submitOrder () {
    ipcRenderer.send('consoleLog', '\n' + '************ new order *********');
    
    // set isFileDone to false each time we submit a job
    isFileDone = false;

    // reset view pane
    resetViewOrderPane();

    // clear out any old files we have viewed first
    var tmpFile = remote.getGlobal('sharedObj').tempFile;
    if (tmpFile) {
        ipcRenderer.send('deleteFile', tmpFile);
    };
    
    // get the Order Type selector's value and associated text of the option
    var orderTypeSelector = document.getElementById("orderTypeSelector");
    var myOrderType = orderTypeSelector.value;
    var optionText = orderTypeSelector.options[orderTypeSelector.selectedIndex].text;
    
    // get the order number
    var myOrderNumber = document.getElementById("submitOrderNumber").getAttribute("data-value");
    ipcRenderer.send('consoleLog', 'Order Number ' + myOrderNumber + ' will be submitted' + '\n');

    // update the text for the job submitted modal
    document.getElementById("orderSubmittedLabel").innerHTML = myOrderNumber + " [" + optionText + "]";
    
    // build sql connect config object
    var myConfig = buildConfig(); 
    
    // call sql stored proc to insert row to job queue/batches
    ipcRenderer.send('sendBatch', myOrderNumber, myOrderType, myConfig);
    
    // when we are notified batch is done, log it
    ipcRenderer.once('notifyBatchReply', function(event, batchID) {
        ipcRenderer.send('consoleLog', 'Batch: ' + batchID + ' reply is received' + '\n');
        getDisplayFileName(myOrderNumber, myOrderType);
    });
};

function buildConfig () {
    var sqlConfig = {};
    var authType = document.getElementById("loginAuthType").getAttribute("data-value");
    var userName = document.getElementById("loginUserID").getAttribute("data-value");
    var passwordText = document.getElementById("loginUserPswd").getAttribute("data-value");
    var serverName = document.getElementById("loginServerAddr").getAttribute("data-value");
    var dbName = document.getElementById("loginDBName").getAttribute("data-value");
    var dbDriver = document.getElementById("dbDriver").getAttribute("data-value");

    if (authType == "W") {
            sqlConfig = {
                driver: dbDriver,
                server: serverName,
                database: dbName,
                options: {
                    trustedConnection: true
                }
            };
        
    } else {
        if (userName && passwordText && serverName && dbName) {
            sqlConfig = {
                user: userName,
                password: passwordText,
                server: serverName,
                database: dbName
            };

        };
    };

    ipcRenderer.send("consoleLog", "buildConfig.config: " + JSON.stringify(sqlConfig));
    return sqlConfig;
};

function getDisplayFileName (orderNumber, orderType) {
    var config = buildConfig();

    ipcRenderer.send('getOrderViewFileName', config, orderNumber, orderType);

    ipcRenderer.once('orderViewFileNameReply', function(event, fileName) {
        ipcRenderer.send('deleteFile', fileName);
        ipcRenderer.once('deleteFileReply', function(event, fileName) {
            ipcRenderer.send('watchFile', fileName);
            ipcRenderer.send('consoleLog', 'Waiting for file: ' + fileName + '\n');
            //ipcRenderer.once('watchFileReply', function(event, fileName) {
            ipcRenderer.on('watchFileReply', function(event, fileName) {
                if (isFileDone == false) {
                    isFileDone = true;
                    loadPDF(fileName);
                };
            });
            
        });
    });
};

function loadPDF(fname) {
    var source = fname;
    $('#myJobModal').modal('hide');

    var target = 'pdf.js/web/' + require('path').basename(fname);
    ipcRenderer.send("copyFile", source, target);
    ipcRenderer.once('copyFileReply', function(event, target) {
        var newTarget = require('path').basename(target);
        var uri = encodeURIComponent(newTarget);
        ipcRenderer.send("updateTempFileName", target);
        //$('#viewOrderIframe').attr('src', 'pdf.js/web/viewer.html?file=' + uri);
        document.getElementById('viewOrderIframe').attr('src', 'pdf.js/web/viewer.html?file=' + uri)
        //$('#viewOrderIframe').attr('src', 'web/viewer.html?file=' + uri);
        document.getElementById('viewOrderIframe').style.display = 'block';
        //$('#viewOrderIframe').show();
    });

};


function resetViewOrderPane() {
    //$('#viewOrderIframe').attr('src', '');
    document.getElementById('viewOrderIframe').attr('src', '');
    //$('#viewOrderIframe').hide();
    document.getElementById('viewOrderIframe').style.display = "none";
};

function saveOS() {
    var dbDriver = "";

    var platformOS = remote.getGlobal('sharedObj').platformOS;

    if (platformOS == "win32") {
        dbDriver = "msnodesqlv8";
    } else {
        dbDriver = "tedious";
    };

    document.getElementById("platformOS").setAttribute("data-value", platformOS);
    document.getElementById("dbDriver").setAttribute("data-value", dbDriver);
    if (platformOS == "win32") {
        // default authorization type to "W" (windows authentication)
        document.getElementById("loginAuthType").setAttribute("data-value", "W");

        // update connect db div to show Windows Authorization as default
        showWindowsAuth();
    } ;

}

function showWindowsAuth() {
    document.getElementById('authSelectorLabel').style.display = 'block';
    document.getElementById('authSelector').style.display = 'block';
    document.getElementById('authSelectorBreak').style.display = 'block';
    document.getElementById('userNameText').disabled = true;
    document.getElementById('userPswdText').disabled = true;
}

// populate db selector
function populateDBSelector(dbList) {
    var options = '';
/*
    $.each(dbList, function(index, value) {
        options += '<option value="' + value.name + '">' + value.name + '</option>';
    });
*/
    for (const value in dbList) {
        options += '<option value="' + value + '">' + value + '</option>';
    }

    //$('#dbSelector').append(options);
    document.getElementById("dbSelector").append(options);
};

// check if order number is valid
function checkOrderValidity(orderNumber, orderType) {
    var myConfig = buildConfig();
    var myValidText = document.getElementById("validOrderText");
    var disabledStatus = false;
    ipcRenderer.send("checkForValidOrder", orderNumber, orderType, myConfig);
    ipcRenderer.once('checkForValidOrderReply', function(event, isValid) {
        if (isValid && (isValid = true)) {
            myValidText.innerHTML = "";
            disabledStatus = false;
        }
        else {
            myValidText.innerHTML = "Invalid Order";
            disabledStatus = true;
        }
        document.getElementById("submitButton").disabled = disabledStatus;
    });
};

module.exports = resetViewOrderPane;
module.exports = buildConfig;
module.exports = checkOrderValidity;
module.exports = saveConfig;
