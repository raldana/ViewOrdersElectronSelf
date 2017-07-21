/*
function getOrderFileName(event, orderNumber, orderType) {
  var outName = orderType + 'O-' + orderNumber + '.pdf';
  event.sender.send('orderViewFileNameReply', outName);
};
*/


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
    console.log('notifyOutputName - Output file is: ' + outputName + '\n');
    
    // send message with file name
    event.sender.send('orderViewFileNameReply', outputName);
    
    // reset the variables now that we are done
    outputName = "";
    folderName = "";
    imageName = "";
  }
};

// call functions to get output folder and file name
function getOrderFileName(event, config, orderNumber, orderType) {
  console.log('getOrderFileName - orderNumber is: ' + orderNumber + '\n');
  sql.connect(config, function (err) {
    if (err !== null) {
        console.log(err);
        console.log('file name error');
      return;
    };

    getOutputFileFolder(event, orderNumber, orderType, notifyOutputName);
    getOutputFileName(event, orderNumber, orderType, notifyOutputName);
  });
};

// get the folder name used to dump the output file
function getOutputFileFolder(event, orderNumber, orderType, callback) {
  var outName = '';
  outName = "\\\\OSS04\\DOUser\\\Output\\\PrintImages\\\RemoteJobs\\";
  callback(event, outName, imageName) ;
/*
  var request = new sql.Request();
  request.input('OrderNo', sql.VarChar(15), orderNumber);
  request.input('OrderType', sql.Char(1), orderType);
  request.input('BillingStatKey', sql.Int, 0);
  request.output('PathFileName', sql.VarChar(500), '');
  request.execute('odDisplayGetPrintImageFldrAP')
    .then( function(recordsets, PathFileName) {
      outName = request.parameters.PathFileName.value;
      callback(event, outName, imageName) ;
    })
    .catch(function (err) {
      console.log(err);
    });
*/

};

// get the output file name
function getOutputFileName(event, orderNumber, orderType, callback) {
  var docType = orderType;

  // purchase orders need to be converted to "P"
  if (docType == "U") {
    docType = "P";
  };

  var outName = docType + 'O-' + orderNumber + '.pdf';
  callback(event, folderName, outName) ;
};

exports.getOrderFileName = getOrderFileName;