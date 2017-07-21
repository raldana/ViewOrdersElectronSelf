var ipcMain = require('electron').ipcMain;
var path = require("path");
var fs = require('fs');
var sql = require('mssql');
//var Config = require('config-js');
//var config = new Config('./config/config.js');


var outputFileName = "";
var outputDataStream = "";
var outputJobString = "";
var outputResultSet;

var sessionKey = 0;
var batchID = 0;
var jobString = '';

var config = buildConfig();
sendBatch("000004753", "A", config);

function buildConfig () {
    var sqlConfig = {};
    var authType = "W";
    var userName = "aris";
    var passwordText = "Datdbmae(@360)";
    var serverName = "WS08TEST";
    var dbName = "RA_Digicel_DO";
    var dbDriver = "tedious";

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
};

function sendBatch(orderNo, orderType, config) {
//  var config = buildConfig();
    var authType = "W";
    var userName = "aris";
    var passwordText = "Datdbmae(@360)";
    var serverName = "WS08TEST";
    var dbName = "RA_Digicel_DO";
    var dbDriver = "tedious";
    var config = {
                user: userName,
                password: passwordText,
                server: serverName,
                database: dbName
            };

  const sql = require('mssql')

  sql.connect(config, err => {

    // create default od job
    const request = new sql.Request()
    request.input('OrderNumber', sql.VarChar(20), orderNo)
    request.input('OrderType', sql.Char, orderType)
    request.input('PrinterID', sql.VarChar(200), '')
    request.output('BatchID', sql.Int, 0)
    request.output('ActiveSessionKey', sql.Int, sessionKey)
    request.input('IsSelfProcess', sql.Bit, 1)
    request.execute('odCreateDefaultJobAP', (err, result) => {
      if (err)
        console.log(err)
      batchID = request.parameters.BatchID.value
      sessionKey = request.parameters.ActiveSessionKey.value
      console.log(request.parameters.BatchID.value)

      // perform data collection
      collectionRequest = new sql.Request()
      collectionRequest.input('ActiveSessionKey', sql.Int, sessionKey)
      collectionRequest.input('BatchID', sql.Int, batchID)
      collectionRequest.execute('odInvDataCollectionAP', (err) => {
        if (err) {
          console.log(err)
        }
        else {
          console.log('completed odInvDataCollectionAP')

          // perform data formatting
          const formatRequest = new sql.Request()
          formatRequest.input('ActiveSessionKey', sql.Int, sessionKey)
          formatRequest.input('BatchID', sql.Int, batchID)
          formatRequest.execute('odInvDATTextInsAP', (err) => {
            if (err) {
              console.log(err)
            }
            else {
              console.log('completed odInvDATTextInsAP')
              
              // build the job header string
              const jobHeaderRequest = new sql.Request()
              jobHeaderRequest.input('ActiveSessionKey', sql.Int, sessionKey)
              jobHeaderRequest.input('BatchID', sql.Int, batchID)
              jobHeaderRequest.input('OrderNo', sql.VarChar(20), orderNo)
              jobHeaderRequest.output('JobString', sql.VarChar(1000), jobString)
              jobHeaderRequest.execute('odJobHeaderBuildAP', (err) => {
                if (err) {
                  console.log(err)
                }
                else {
                  if (jobHeaderRequest.parameters.JobString.value) {
                    jobString = jobHeaderRequest.parameters.JobString.value
                    console.log("Raw Job Header: " + jobString)
                    jobString = fixJobHeader(jobString)
                    outputJobString = jobString
                  }
                  console.log('completed odJobHeaderBuildAP')
                }
                  //sql.close()
              })
            }
          })
        }
      })
    })    // request.execute
  })    // sql.connect
  
  sql.on('error', function() {
      sql.close()
  })
};

/*
  modify the job header string so that the output path/file no longer references the
  default path - we need to modify it so that the new path is our local folder
*/
function fixJobHeader (stringToFix) {
  console.log("***********" + "\n")
  console.log("Job header (before fix): " + stringToFix + "\n");
  console.log("beginning fixJobHeader()")


  var targetString = "";
  var fileName = "";
  var newJobHeader = "";
  var extension = "";
  var s = stringToFix;

  // split the job header string to an array
  var optionsArray = s.match(/(?:[^\s"]+|"[^"]*")+/g);
  var arrayLength = optionsArray.length;

  // get the file name from the full target path (remove quotes around)
  for (var i = 0; i < arrayLength; i++) {
      if (optionsArray[i].includes("target")) {
        targetString = optionsArray[i].substring(7);
        fileName = targetString.replace(/['"]+/g, '');
        fileName = path.basename(fileName);
        extension = path.extname(fileName);
        outputFileName = path.basename(fileName, extension);
      }
  }

  // concantenate the local path + file name
  fileName = "\\\\OSS04\\DOUser\\Output\\PrintImages\\RemoteJobs\\" + fileName;
  console.log("file name: " + fileName)
  console.log("string to array: " + optionsArray)
  
  // now recreate the update job header string
  if (fileName) {
    var arrayString = "";
    for (var i = 0; i < arrayLength; i++) {
        arrayString = optionsArray[i];
        if (i > 0) {
          if (arrayString.includes("UTF-8")) {
            newJobHeader = newJobHeader + "\r\n";
          } else {
            newJobHeader = newJobHeader + " ";
          }
        }
        if (arrayString.includes("target")) {
          newJobHeader =  arrayString  + fileName;
        }
        else {
          newJobHeader =  arrayString + optionsArray[i];
        }
    }
  }

  console.log("Fixed Job Header (after fix): " + newJobHeader);
  console.log("completed fixJobHeader()")
  console.log("***********" + "\n")
  return newJobHeader;
}

/*
  Loop through our SQL result set and create a string out of it
*/
/*function createXMLString (resultSet) {
  //console.log("createXMLString input: " + resultSet);
  var xmlData = "";
  var rowData = "";
  var rowCount = resultSet.length;
  console.log("Number of rows in recordset: " + rowCount);
  
  for (var i = 0; i < rowCount; i++) {
    rowData = resultSet[i].DATText;
    xmlData = xmlData + rowData;
  }

  resultSet.forEach(function(element) {
    rowData = element.DATText;
    xmlData = xmlData + rowData;
  }, this);

  return xmlData;
}
*/

/*
  Delete the batch data we created
*/
/*
function  cleanupJob(activessionKey, batchId) {
  var sql = require('mssql');
  var sessionKey = 0;
  var batchID = 0;
  var jobString = '';

  sql.connect(config, function (err) {
    if (err !== null) {
      console.log(err);
    };

    sql.on('error', function() {
      sql.close();
    });

    var request = new sql.Request();
    request.input("ActiveSessionKey", sql.BigInt, activessionKey);
    request.input("BatchID", sql.BigInt, batchId);
    request.execute("odOrderQRunDataCleanupAP")
      .catch(function (err) {
        console.log(err);
      });

  });
}
*/

/*function writeFileToQueue(outputPath, dataString) {
  if (outputPath && dataString) {
    fs.writeFile(outputPath, data, function(err) {
      if (err) {
        console.log(err);
      }
    });
  }
}
*/
exports.sendBatch = sendBatch;