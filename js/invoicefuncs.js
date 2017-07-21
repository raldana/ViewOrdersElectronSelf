
var sql = require('mssql');
var folderName = '';
var imageName = '';
var outputName = '';

// function used to send output folder/file name to renderer proces
function notifyOutputName (event, folder, file) {
  if (folder) {
      folderName = folder;
  };
  
  if (file) {
      imageName = file;
  };
  
  if (folderName && imageName){
    outputName = folderName + imageName;
        
    // send message with file name
    event.sender.send('orderViewFileNameReply', outputName);
    
    // reset the variables now that we are done
    outputName = "";
    folderName = "";
    imageName = "";
  }
};

// function used to send output folder/file name to renderer proces
function notifyValidOrder (event, isValidOrder) {
    // send message with order validity
    event.sender.send('checkForValidOrderReply', isValidOrder);
};


// call functions to get output folder and file name
function getInvoiceFileName(event, config, orderNumber) {
  sql.connect(config, function (err) {
    if (err !== null) {
        console.log(err);
        console.log('file name error');
      return;
    };

    getOutputFileFolder(event, orderNumber, 'I', notifyOutputName);
    getOutputFileName(event, orderNumber, notifyOutputName);
  });
};

// get the folder name used to dump the output file
function getOutputFileFolder(event, orderNumber, orderType, callback) {
  var outName = '';
  outName = "\\\\OSS04\\DOUser\\\Output\\\PrintImages\\\RemoteJobs\\";
  callback(event, outName, imageName) ;
};

// get the output file name
function getOutputFileName(event, orderNumber, callback) {
  var outName = '';
  
  var request = new sql.Request();
  request.input('InvoiceNo', sql.VarChar(15), orderNumber);
  request.input('DetailLevel', sql.Int, 0);
  request.output('DATFileName', sql.VarChar(500), '');
  request.execute('odDisplayInvBuildFileNameAP')
    .then( function(recordsets, DATFileName) {
      outName = request.parameters.DATFileName.value + '.pdf';
      callback(event, folderName, outName) ;
    })
    .catch(function (err) {
      console.log(err);
    });
};

// validate order (check if order number/type exists)
function checkForValidOrder(event, orderNumber, orderType, config) {
  var isInvoice = 0;
  var docType = '';
  var isValid = false;
  sql.connect(config, err => {
    var request = new sql.Request();
    request.input('InvoiceNo', sql.VarChar(15), orderNumber);
    request.output('Type', sql.Char(1), '');
    request.output('Total', sql.Numeric(16,2), 0);
    request.output('InvAccDetailTableKey', sql.Int, 0);
    request.output('IsInvoice', sql.Bit, 0);
    request.output('IsPrinted', sql.Bit, 0);
    request.output('CustomerKey', sql.Int, 0);
    request.input('BillingStatKey', sql.Int, 0);
    request.input('OrderType', sql.Char(1), orderType);
    request.execute('arInvoiceVwrGetInvTypAndTotAP')
      .then( function(recordsets, Type, Total, InvAccDetailTableKey, IsInvoice, IsPrinted, CustomerKey) {
        isInvoice = request.parameters.IsInvoice.value;
        docType = request.parameters.Type.value;

        if (docType == undefined || docType == null) {
          docType = "X"
        }

        // if the order types are the same, then the sproc found the order (order exists so its valid). if
        // they don't match then the order was not found or it's the wrong order type - either way the
        // order gathering process won't work
        if (docType == orderType) { 
          isValid = true;
        }
        
        // call function to send reply
        notifyValidOrder(event, isValid);
      })
      .catch(function (err) {
        console.log(err);
      });
  });
};

exports.getInvoiceFileName = getInvoiceFileName;
exports.checkForValidOrder = checkForValidOrder;
