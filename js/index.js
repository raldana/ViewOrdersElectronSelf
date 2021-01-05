const remote = require('electron').remote;
const ipcRenderer = require('electron').ipcRenderer;
let isFileDone = false;
let dbConnectState = false;


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
/*
function testConn (config) {
    ipcRenderer.send("consoleLog","testConn (index.js)");
    var myStatus = document.getElementById("connStatusText");
    loginAuthType = remote.getGlobal("sharedObj").authType;
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
        } else {
            // change the connect status text/color
            myStatus.style.color = "red";
            myStatus.innerHTML = "Connect failed";
            document.getElementById("connectButton").innerHTML = "Connect";
        };
    });

};
*/
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
    ipcRenderer.send("consoleLog", "indexjs.submitOrder() - submitting order: " + myOrderNumber);
    ipcRenderer.send('sendBatch', myOrderNumber, myOrderType, myConfig);
    
    // when we are notified batch is done, log it
    ipcRenderer.once('notifyBatchReply', function(event, batchID) {
        ipcRenderer.send('consoleLog', 'Batch: ' + batchID + ' reply is received' + '\n');
        getDisplayFileName(myOrderNumber, myOrderType);
    });
};

function buildConfig () {
    return remote.getGlobal("sharedObj").sqlConfig;
/*
    var sqlConfig = {};

    let authType = remote.getGlobal("sharedObj").authType;
    let userName = remote.getGlobal("sharedObj").userName;
    let passwordText = remote.getGlobal("sharedObj").userPswd;
    let serverName = remote.getGlobal("sharedObj").serverAddress;
    let dbName = remote.getGlobal("sharedObj").dbName;
    let dbDriver = remote.getGlobal("sharedObj").dbDriver;

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

    return sqlConfig;
*/
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
    let source = fname;
    //$('#myJobModal').modal('hide');
    document.getElementById('myJobModal').style.display = "none";

    //let target = 'pdf.js/web/' + require('path').basename(fname);
    let target = 'web/' + require('path').basename(fname);
    ipcRenderer.send("copyFile", source, target);
    ipcRenderer.once('copyFileReply', function(event, target) {
        var newTarget = require('path').basename(target);
        var uri = encodeURIComponent(newTarget);
        ipcRenderer.send("updateTempFileName", target);
        //document.getElementById('viewOrderIframe').attr('src', 'pdf.js/web/viewer.html?file=' + uri)
        document.getElementById('viewOrderIframe').src = (__dirname + '/web/viewer.html?file=' + uri)
        //$('#viewOrderIframe').attr('src', 'web/viewer.html?file=' + uri);
        document.getElementById('viewOrderIframe').style.display = 'block';
        //$('#viewOrderIframe').show();
    });

};


function resetViewOrderPane() {
    document.getElementById('viewOrderIframe').src = '';
    //document.getElementById('viewOrderIframe').style.display = "none";
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
function populateDBSelector() {
    let options = remote.getGlobal("sharedObj").dbList;
    let select = document.getElementById("dbSelector");
    for (i = 0; i < options.length; i++) {
        let opt = options[i];
        let el = document.createElement("option");
        el.textContent = opt;
        el.value = opt;
        select.appendChild(el);
       // select.append(el);
    }

    //$('#dbSelector').append(options);
   // document.getElementById("dbSelector").append(options);
   // ipcRenderer.send("consoleLog", "populateDBSelector: " + JSON.stringify(options))
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

// populate the server data
function populateServerData() {
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
        document.getElementById("dbNameText").value = dbName;
        document.getElementById("userNameText").value = userName;
        document.getElementById("userPswdText").value = userPswd;
        document.getElementById("connStatusText").innerText = "Connected";
        document.getElementById("connStatusText").style.color = "green";
    }
    populateDBSelector();
};

module.exports = resetViewOrderPane;
module.exports = buildConfig;
module.exports = checkOrderValidity;
module.exports = populateServerData;
//module.exports = saveConfig;
