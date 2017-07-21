const ipcMain = require('electron').ipcMain;
const path = require("path");
const fs = require('fs');
const sql = require('mssql');

var outputFileName = "";
var outputDataStream = "";
var outputJobString = "";
var sessionKey = 0;
var batchID = 0;
var dbConfig = ""
var config = buildConfig();
sendBatch("000004753", "A", config);

function okToWriteFile() {
  if (outputFileName && outputJobString && outputDataStream) {
    writeFileToQueue(outputFileName, outputDataStream, outputJobString)
  }
}

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


/// *************************************
/// function: 
/// *************************************



/// *************************************
/// function: SendBatch
/// *************************************
function sendBatch(orderNo, orderType, oldconfig) {
  var jobString = '';
//  var outputResultSet;

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
  
  dbConfig = config;

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
        console.log("Batch ID: " + request.parameters.BatchID.value)

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
                    //console.log("Raw Job Header: " + jobString)
                    fixJobHeader(jobString)
                    console.log('completed odJobHeaderBuildAP')

                    // get the dat text data
                    const dataRequest = new sql.Request()
                      dataRequest.input('ActiveSessionKey', sql.Int, sessionKey)
                      dataRequest.input('BatchID', sql.Int, batchID)
                      dataRequest.input('OrderNo', sql.VarChar(20), orderNo)
                      dataRequest.execute('odOrderSelectOneAP', (err, recordset) => {
                        if (err) {
                          console.log(err)
                        } else {
                          //console.log(recordset)
                          outputResultSet = recordset
                          console.log('completed odOrderSelectOneAP')
                          createXMLString(recordset);
                          //writeFileToQueue(outputFileName, outputDataStream, outputJobString);
                        }
                      })
                  }
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
      sql.close();
  })
};

function notifyBatchComplete (event, batchID) {
  event.sender.send('notifyBatchReply', batchID);
  console.log('Batch: ' + batchID + ' is sent');
};

/*
  modify the job header string so that the output path/file no longer references the
  default path - we need to modify it so that the new path is our local folder
*/
function fixJobHeader (stringToFix) {
  var targetString = "";
  var fileName = "";
  var newJobHeader = "";
  var extension = "";
  var arrayString = "";
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
  //outputFileName = fileName;
  outputFileName = "\\\\OSS04\\DOUser\\FolderMonitor\\Adhoc\\JobQueue\\" + path.basename(fileName, ".pdf") + ".xml";
  
  // now recreate the update job header string
  if (fileName) {
    arrayString = "";
    for (var i = 0; i < arrayLength; i++) {
        arrayString = optionsArray[i];
        if (arrayString.includes("target")) {
          newJobHeader =  newJobHeader + "target=" + "\"" + fileName + "\"";
        }
        else {
          newJobHeader =  newJobHeader + arrayString// + optionsArray[i];
        }

        //if (i = 0)
        if (arrayString.indexOf("UTF-8") !=-1) {
            newJobHeader = newJobHeader + "\r\n";
        } else {
          newJobHeader = newJobHeader + " ";
        }
    }
    newJobHeader = newJobHeader + "\r\n";
  }

  outputJobString = newJobHeader;
  okToWriteFile();
}

/*
  Loop through our SQL result set and create a string out of it
*/
function createXMLString (resultSet) {
  var xmlData = "";
  var elementData;
  
  resultSet[0].forEach(function(element) {
    elementData = element.DATText;
    xmlData = xmlData + element.DATText;
  }, this);

  outputDataStream = xmlData;
  okToWriteFile();
  console.log("xml file written");
}


/*
  Delete the batch data we created
*/
function  cleanupJob(config) {
  var sql = require('mssql');
  sql.connect(config, function (err) {
    if (err) {
      console.log(err);
    };

    var request = new sql.Request();
    request.input("ActiveSessionKey", sql.BigInt, sessionKey);
    request.input("BatchID", sql.BigInt, batchID);
    request.execute("odOrderQRunDataCleanupAP")
      .then(() => {
        console.log("completed job cleanup")
      })
      .catch(function (err) {
        console.log(err);
      });

    sql.on('error', function() {
      sql.close();
    });

  });
}

function writeFileToQueue(outputPath, dataString, jobHeaderString) {
  if (outputPath && dataString && jobHeaderString) {
    var newString = jobHeaderString + dataString
    fs.writeFile(outputPath, newString, function(err) {
      if (err) {
        console.log(err);
      }
    });
    cleanupJob(dbConfig)
  }
}

exports.sendBatch = sendBatch;