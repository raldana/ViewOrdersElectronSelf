
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
    getOutputFileFolder(event, orderNumber, 'I', notifyOutputName);
    getOutputFileName(event, orderNumber, notifyOutputName);
};

// get the folder name used to dump the output file
function getOutputFileFolder(event, orderNumber, orderType, callback) {
  var outName = '';
  outName = "\\\\AZ-WIN19TEST-01\\DOUser\\\Output\\\PrintImages\\\RemoteJobs\\";
  callback(event, outName, imageName) ;
};

// get the output file name
function getOutputFileName(event, orderNumber, callback) {
  var outName = '';
  try {
    sql.connect()
    .then(pool => {
      return pool.request()
      .input('InvoiceNo', sql.VarChar(15), orderNumber)
      .input('DetailLevel', sql.Int, 0)
      .output('DATFileName', sql.VarChar(500), '')
      .execute('odDisplayInvBuildFileNameAP', (err, results) => {
        outName = results.output.DATFileName + '.pdf';
        callback(event, folderName, outName) ;
      })
    })
    .catch(err => {
      console.log(err);
    })
  } catch (e) {
    console.error(e)
  }
};

// validate order (check if order number/type exists)
function checkForValidOrder(event, orderNumber, orderType, config) {
  var isInvoice = 0;
  var docType = '';
  var isValid = false;
  try {
    sql.connect()
    .then(pool => {
      return pool.request()
      .input('InvoiceNo', sql.VarChar(15), orderNumber)
      .output('Type', sql.Char(1), '')
      .output('Total', sql.Numeric(16,2), 0)
      .output('InvAccDetailTableKey', sql.Int, 0)
      .output('IsInvoice', sql.Bit, 0)
      .output('IsPrinted', sql.Bit, 0)
      .output('CustomerKey', sql.Int, 0)
      .input('BillingStatKey', sql.Int, 0)
      .input('OrderType', sql.Char(1), orderType)
      .execute('arInvoiceVwrGetInvTypAndTotAP', (err, results) => {
        isInvoice = results.output.IsInvoice;
        docType = results.output.Type;

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
    })
    .catch(err => {
      console.log(err);
    })
  
  } catch (e) {
    console.error(e)
  }
};

exports.getInvoiceFileName = getInvoiceFileName;
exports.checkForValidOrder = checkForValidOrder;
