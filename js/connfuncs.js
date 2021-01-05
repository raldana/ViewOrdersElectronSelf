const remote = require('electron').remote;
const sql = require('mssql');

// update the global config object
function updateGlobalConfig(config) {
  global.sharedObj.sqlConfig = config;
  console.log('New config object is: ' + global.sharedObj.sqlConfig + '\n');
}

// updates the global session key
function updateGlobalSessionKey(updatedSessionKey) {
  global.sharedObj.sessionKey = updatedSessionKey;
  console.log('New session key is: ' + global.sharedObj.sessionKey + '\n');
};

// test the sql server connection
function testConn(config, event) {
  let remote = require('electron').remote;
  let isConnected = true;
  //var connection = new sql.Connection(config);
  let oldSessionKey = 0;
  
  // try making a connection with this config
  sql.connect(config)
    .then(pool =>{
      isConnected = true;
    })
    .catch(err => {
      isConnected = false;
      console.log(err);
    });

    notifyConnState(event, isConnected, config.server);

    if (isConnected) {
      getDBList(config, event);
    };

};

// reply that we have finished our connection test
function notifyConnState (event, connState, serverName) {
  event.sender.send('testConnReply', connState);
  console.log('Connection state (' + serverName + '): ' + connState + '\n');
};

// function to create new SQL session key
// get the folder name used to dump the output file
function getActiveSessionKey(config, callback) {
  console.log('starting getActiveSessionKey...' + '\n');
  let outKey = 0;

  sql.connect(config, function (err) {
    if (err !== null) {
      console.log(err);
    };
  
    var request = new sql.Request();
    request.output('ActiveSessionKey', sql.Int, 0);
    request.execute('utCreateADMActiveSessionAP')
      .then( function(recordsets, ActiveSessionKey) {
        outKey = request.parameters.ActiveSessionKey.value;
        console.log('outKey: ' + outKey + '\n');
        callback(outKey);
      })
      .catch(function (err) {
        console.log(err);
      });

    sql.close();
  });

  return outKey;
};

// function to create new SQL session key
// get the folder name used to dump the output file
function deleteActiveSessionKey(sessionKey, config) {
  console.log('starting deleteActiveSessionKey: ' + sessionKey + '\n');
  var sqlConfig = {
                user: config.user,
                password: config.password,
                server: config.server,
                database: config.database
            };
  console.log('sqlConfig: ' + sqlConfig + '\n');
};


// get database list from server
function getDBList(config, event) {
  let sql = require('mssql');
  //let sql = global.sharedObj.sqlConn;
  let options = '';
  (async function () {
    try {
        //let pool = await sql.connect(config)
        let pool = await sql.connect()
        let recordset = await pool.request()
            .query('Select [name] from master.dbo.sysdatabases where dbid > 4 order by [name]')
            
        //console.log(recordset);
        global.sharedObj.dbList = recordset;
        event.sender.send("fillGlobalDBList", recordset);
    
    } catch (err) {
        console.log("connfuncs.getDBList() error running query to get db list: " + JSON.stringify(err));
    }
  })()
 

};

// reply that we have finished our connection test
function populateDBSelector (event, dbList) {
  console.log("populateDBSelector()");
  event.sender.send('populateDBSelector', dbList);
};


exports.testConn = testConn;
exports.getActiveSessionKey = getActiveSessionKey;
exports.deleteActiveSessionKey = deleteActiveSessionKey;
exports.getDBList = getDBList;
