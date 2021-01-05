const path = require("path");
const fs = require('fs');
const sql = require('mssql');
const { ok } = require("assert");
let outputFileName = "";
let outputDataStream = "";
let outputJobString = "";
let sessionKey = 0;
let batchID = 0;
let callingEvent;
let dataCollectionCompleted = false;
let dataFormattingCompleted = false;

/// *************************************
/// function: okWriteToFile
/// *************************************
function okToWriteFile() {
  if (outputFileName && outputJobString && outputDataStream) {
    notifyBatchComplete(callingEvent, batchID);
    writeFileToQueue(outputFileName, outputDataStream, outputJobString)
  }
}

/*
  Loop through our SQL result set and create a string out of it
*/
async function createXMLString (resultSet) {
  let xmlData = "";
  let elementData;
  return new Promise((resolve, reject) => {
    try {
      if (resultSet) {
        resultSet.recordsets[0].forEach(function(element) {
          elementData = element.DATText;
          xmlData = xmlData + element.DATText;
        }, this)
        if (xmlData) {
          outputDataStream = xmlData;
          console.log("batchfuncs.createXMLString() - xml file created");
        } else {
          console.log("batchfuncs.createXMLString() - no xml file created - xmlData does not exist");
        }
        resolve(xmlData)
      }
    } catch (e)  {
      console.error(e);
    }
  })
}

async function buildJobHeader(sessionKey, batchID, orderNo)  {
  console.log("batchfuncs.buildJobHeader()");
  let jobString;
  return new Promise((resolve, reject) => {
    try{
      sql.connect()
      .then(pool => {
        return pool.request()
          .input('ActiveSessionKey', sql.Int, sessionKey)
          .input('BatchID', sql.Int, batchID)
          .input('OrderNo', sql.VarChar(20), orderNo)
          .output('JobString', sql.VarChar(1000), jobString)
          .execute('odJobHeaderBuildAP', (err, results) => {
            if (results.output.JobString) {
              fixJobHeader(results.output.JobString)
            }
            resolve(results.output.JobString);
        })
        console.log('completed odJobHeaderBuildAP')
      })
      .catch(err => {
        console.log(err);
      })

    } catch (e) {
      console.error(e)
    }
  })
}

async function selectXMLData(sessionKey, batchID, orderNo) {
  console.log("batchfuncs.selectXMLData() - sessionKey = " + sessionKey + " , batchID = " + batchID + ", orderNo = " + orderNo);
  let recordsets;
  return new Promise((resolve, reject) => {
    try {
      sql.connect()
        .then(pool => {
          // get the dat text data
          return pool.request()
              .input('ActiveSessionKey', sql.Int, sessionKey)
              .input('BatchID', sql.Int, batchID)
              .input('OrderNo', sql.VarChar(20), orderNo)
              .execute('odOrderSelectOneAP', (err, results) => {
                console.log('completed odOrderSelectOneAP')
                recordsets = results
                resolve(recordsets);
            })
          })
        .catch(err => {
          console.log(err);
        })
    } catch (e) {
      console.error(e)
    }
  })
}

async function dataFormatting(sessionKey, batchID) {
  console.log("batchfuncs.dataFormatting()");
  return new Promise((resolve, reject) => {
    try {
      sql.connect()
      .then(pool =>{
        // perform data formatting
        return pool.request()
          .input('ActiveSessionKey', sql.Int, sessionKey)
          .input('BatchID', sql.Int, batchID)
          .execute('odInvDATTextInsAP', (err) => {
            dataFormattingCompleted = true;
            console.log('completed odInvDATTextInsAP')
            resolve(dataFormattingCompleted);
        })
      })
      .catch(error => {
        console.log(err);
      })
    } catch (e) {
      console.error(e)
    }
  })
}

async function dataCollection(sessionKey, batchID) {
  console.log("batchfuncs.dataCollection() - sessionKey = " + sessionKey + ", batchID = " + batchID);
  return new Promise((resolve, reject) => {
    try {
      sql.connect()
      .then(pool => {
        // perform data collection
        return pool.request()
          .input('ActiveSessionKey', sql.Int, sessionKey)
          .input('BatchID', sql.Int, batchID)
          .execute('odInvDataCollectionAP', (err) => {
            dataCollectionCompleted = true;
            console.log('completed odInvDataCollectionAP')
            resolve(dataCollectionCompleted);
        })
      })
      .catch(err => {
        console.log(err);
      })
    } catch (e) {
      console.error(e)
    }

  })
}

async function createJob(event, orderNo, orderType) {
  console.log("batchfuncs.createJob(): " + "order - " + orderNo + " , orderType " + orderType);
  batchID = 0;

  return new Promise((resolve, reject) => {
    try {
      sql.connect()
      .then(pool => {
        // create default od job
        // return pool.request()
        jobRequest = new sql.Request()
        jobRequest.input('OrderNumber', sql.VarChar(20), orderNo)
        jobRequest.input('OrderType', sql.VarChar(1), orderType)
        jobRequest.input('PrinterID', sql.VarChar(200), '')
        jobRequest.output('BatchID', sql.Int, batchID)
        jobRequest.output('ActiveSessionKey', sql.Int, sessionKey)
        jobRequest.input('IsSelfProcess', sql.Bit, 1)
        jobRequest.execute('odCreateDefaultJobAP', (err, result) => {
          batchID = result.output.BatchID;
          sessionKey = result.output.ActiveSessionKey;
          console.log("new BatchID: " + batchID)
          jobCreated = true;
          console.log("completed request")
          resolve({
            batchID: result.output.BatchID,
            sessionKey: result.output.ActiveSessionKey
          });
        })
      })
      .catch(err => {
        console.log(err);
      })
    } catch (e) {
      console.error(e)
    }
  })
}


/// *************************************
/// function: SendBatch
/// *************************************
async function sendBatch(event, orderNo, orderType) {
  let newJobKeys = {};
  let jobString = "";
  let orderData;
  let xmlData = "";
  callingEvent = event; // name of event object that called us, so we can send back notification

  try {
    console.log("batchfuncs.sendBatch()");
    newJobKeys = await createJob(event, orderNo, orderType);
    const dcDone = await dataCollection(newJobKeys.sessionKey, newJobKeys.batchID);
    const dfDone = await dataFormatting(newJobKeys.sessionKey, newJobKeys.batchID);
    jobString = await buildJobHeader(newJobKeys.sessionKey, newJobKeys.batchID, orderNo);
    orderData = await selectXMLData(newJobKeys.sessionKey, newJobKeys.batchID, orderNo);
    xmlData = await createXMLString(orderData);
    if (xmlData) {
      okToWriteFile();
      notifyBatchComplete(event, newJobKeys.batchID);
    }
  } catch (e) {
    console.error(e)
  }
}

function notifyBatchComplete (event, batchID) {
  event.sender.send('notifyBatchReply', batchID);
  console.log('Batch: ' + batchID + ' is sent');
};

/*
  function: fixJobHeader
  
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
  fileName = "\\\\AZ-WIN19TEST-01\\DOUser\\Output\\PrintImages\\RemoteJobs\\" + fileName;
  outputFileName = "\\\\AZ-WIN19TEST-01\\DOUser\\FolderMonitor\\Adhoc\\JobQueue\\" + path.basename(fileName, ".pdf") + ".xml";
  
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
  console.log("batchfuncs.fixJobHeader: filename = " + fileName);

  outputJobString = newJobHeader;
  okToWriteFile();
}


/*
  Delete the batch data we created
*/
function  cleanupJob(sessionKey, batchID) {
  console.log("cleanupJob(): sessionKey = " + sessionKey + " , batchID = " + batchID);

  try {
    sql.connect()
      .then(pool => {
        return pool.request()
          .input("ActiveSessionKey", sql.BigInt, sessionKey)
          .input("BatchID", sql.BigInt, batchID)
          .execute("odOrderQRunDataCleanupAP", (err) => {
            console.error(err)
          })
      })
      .catch(err => {
        console.error(err)
      })
  } catch (e) {
    console.error(e)
  }

/*
  let request = new sql.Request();
    request.input("ActiveSessionKey", sql.BigInt, sessionKey);
    request.input("BatchID", sql.BigInt, batchID);
    request.execute("odOrderQRunDataCleanupAP")
      .catch(function (err) {
        console.log(err);
      });
*/
}


function writeFileToQueue(outputPath, dataString, jobHeaderString) {
  //console.log("batchfuncs.writeFileToQueue() outputPath = " + outputPath + "\n" + " , dataString = " + dataString + "\n" + " , jobHeaderString" + jobHeaderString)
  console.log("batchfuncs.writeFileToQueue()");
  if (outputPath && dataString && jobHeaderString) {
    var newString = jobHeaderString + dataString
    fs.writeFile(outputPath, newString, function(err) {
      if (err) {
        console.log(err);
      }
    });
    cleanupJob(sessionKey, batchID)
  }
}

exports.sendBatch = sendBatch;