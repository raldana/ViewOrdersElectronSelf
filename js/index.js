const remote = require('electron').remote;
const ipcRenderer = require('electron').ipcRenderer;
const logMsgs = [];
let isFileDone = false;
let dbConnectState = false;

// connect to db
function connectToDB () {
    ipcRenderer.send("consoleLog","connecting to db");
    // get the server address
    var myServerAddr = document.getElementById("serverAddrText").value;
    
    // update the text for the db connect modal
    document.getElementById("serverAddrLabel").innerHTML = myServerAddr;
    document.getElementById("newServerNameText").innerHTML = myServerAddr;
    
    // save to document properties
    document.getElementById("loginServerAddr").setAttribute("data-value", myServerAddr);
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
    let tmpFile = remote.getGlobal('sharedObj').tempFile;
    if (tmpFile) {
        ipcRenderer.send('deleteFile', tmpFile);
    };
    
    // get the Order Type selector's value and associated text of the option
    let orderTypeSelector = document.getElementById("orderTypeSelector");
    let myOrderType = orderTypeSelector.value;
    let optionText = orderTypeSelector.options[orderTypeSelector.selectedIndex].text;
    
    // get the order number
    let myOrderNumber = document.getElementById("submitOrderNumber").getAttribute("data-value");
    remote.getGlobal('sharedObj').orderNumber = myOrderNumber;
    ipcRenderer.send('consoleLog', 'Order Number ' + myOrderNumber + ' will be submitted' + '\n');

    // update the text for the job submitted modal
    document.getElementById("orderSubmittedLabel").innerHTML = myOrderNumber + " [" + optionText + "]";

    // build sql connect config object
    let myConfig = buildConfig(); 
    
    // show the job submitted modal
    //ipcRenderer.send("showJobSubmitted");

    // call sql stored proc to insert row to job queue/batches
    ipcRenderer.send("consoleLogThis", "indexjs.submitOrder() - submitting order: " + myOrderNumber);
    ipcRenderer.send('sendBatch', myOrderNumber, myOrderType, myConfig);
    
    // when we are notified batch is done, log it
    ipcRenderer.once('notifyBatchReply', function(event, batchID) {
        ipcRenderer.send('consoleLog', 'Batch: ' + batchID + ' reply is received' + '\n');
        getDisplayFileName(myOrderNumber, myOrderType);
    });

};

function buildConfig () {
    return remote.getGlobal("sharedObj").sqlConfig;
};

function getDisplayFileName (orderNumber, orderType) {
    var config = buildConfig();

    ipcRenderer.send('getOrderViewFileName', config, orderNumber, orderType);

    ipcRenderer.once('orderViewFileNameReply', function(event, fileName) {
        ipcRenderer.send('deleteFile', fileName);
        ipcRenderer.once('deleteFileReply', function(event, fileName) {
            ipcRenderer.send('watchFile', fileName);
            ipcRenderer.send('consoleLog', 'Waiting for file: ' + fileName + '\n');
            ipcRenderer.once('watchFileReply', function(event, fileName) {
                if (isFileDone == false) {
                    isFileDone = true;
                    loadPDF(fileName);
                };
            });
            
        });
    });
};

function loadPDF(fname) {
    ipcRenderer.send("closeJobSubmittedWindow");
    let source = fname;
    //$('#myJobModal').modal('hide');
    document.getElementById('myJobModal').style.display = "none";
    let uri = encodeURIComponent(source );
    ipcRenderer.send("updateTempFileName", source);
    document.getElementById('viewOrderIframe').src = (source)
    document.getElementById('viewOrderIframe').style.display = 'inline-flex';
    document.getElementById('wrapper').removeAttribute("modal-backdrop");
};


function resetViewOrderPane() {
    let orderFrame = document.getElementById('viewOrderIframe')
    //orderFrame.src = '';
    orderFrame.src = 'jobSubmitted.html';
    orderFrame.style.display = "block";
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
    let servAddr = remote.getGlobal("sharedObj").sqlServerAddress;
    let dbName = remote.getGlobal("sharedObj").dbName;
    let userName = remote.getGlobal("sharedObj").userName;
    let userPswd = remote.getGlobal("sharedObj").userPswd;
    let formattedServer = servAddr;
    formattedServer = formattedServer.replace(/\\\//g, "/");
    if (remote.getGlobal("sharedObj").sqlServerAddress) {
        document.getElementById("loginServerAddr").setAttribute("data-value",servAddr);
        document.getElementById("loginDBName").setAttribute("data-value",dbName);
        document.getElementById("loginUserID").setAttribute("data-value",userName);
        document.getElementById("loginUserPswd").setAttribute("data-value",userPswd);
        document.getElementById("loginAuthType").setAttribute("data-value", "S");

        document.getElementById("serverAddrText").value = formattedServer;
        document.getElementById("newServerNameText").value = formattedServer;
        document.getElementById("dbSelector").value = dbName;
        document.getElementById("dbNameText").value = dbName;
        document.getElementById("userNameText").value = userName;
        document.getElementById("userPswdText").value = userPswd;
        document.getElementById("connStatusText").innerText = "Connected";
        document.getElementById("connStatusText").style.color = "green";
    }
    populateDBSelector();
};

// save iframe dimensions
function saveFrameDimensions(frame) {
    let myFrame = frame //document.getElementById(frame);
    let frameHeight = myFrame.clientHeight;
    let frameWidth = myFrame.clientWidth;
    let frameTop = myFrame.offsetTop;
    let frameLeft = myFrame.offsetLeft;
    ipcRenderer.send("setFrameDimensions", frameHeight, frameWidth, frameTop, frameLeft);
}

module.exports = resetViewOrderPane;
module.exports = buildConfig;
module.exports = checkOrderValidity;
module.exports = populateServerData;
module.exports = saveFrameDimensions;
