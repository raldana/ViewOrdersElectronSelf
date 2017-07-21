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
  var remote = require('electron').remote;
  var sql = require('mssql');
  var isConnected = true;
  var connection = new sql.Connection(config);
  var oldSessionKey = 0;
  
  // try making a connection with this config
  connection.connect(function(err) {
    if (err !== null) {
      isConnected = false;
      console.log(err);
    };
    connection.close();
    notifyConnState(event, isConnected, config.server);

    if (isConnected) {
      getDBList(config, event);
    };

/*
    // if we got good connection, delete any old session that existed,
    // and get a new session (update our session key too)
    if (isConnected == true) {
      // update global config object
      //global.sharedObj.sqlConfig = config;
      updateGlobalConfig(config);

      // delete the old session if it existed
      oldSessionKey = global.sharedObj.sessionKey;
      if (oldSessionKey > 0) {
        deleteActiveSessionKey(oldSessionKey, config, updateGlobalSessionKey);
      };

      // call method to get a new sessionkey
      getActiveSessionKey(config, updateGlobalSessionKey);
    };
*/
  });
 
};

// test connection using alternative sql library to get sql server with windows authentication
function testConnV8(config, event) {
  
  var sql = require('.sqlserver.native');
  var conn_str = "Driver={SQL Server Native Client 11.0};Server={WS08TEST};Database={RA_BDC};Trusted_Connection=Yes;";
  var isConnected = true;

  console.log(config);

  sql.open(conn_str, function(err, new_conn) {
    if (err) {
      console.log("error connecting with v8");
    } else {
      console.log("connection successful with v8");
      sql.close();
    };
  });
 
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
  var sql = require('mssql');
  var outKey = 0;

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
//config.user && config.password && config.server && config.database
  console.log('starting deleteActiveSessionKey: ' + sessionKey + '\n');
  var sql = require('mssql');
  var sqlConfig = {
                user: config.user,
                password: config.password,
                server: config.server,
                database: config.database
            };
  console.log('sqlConfig: ' + sqlConfig + '\n');

/*
  //build config object
  var sqlConfig = {
                user: config.user,
                password: config.password,
                server: config.server,
                database: config.database
            };
  console.log('using sqlConfig: ' + sqlConfig + '\n');
  console.log('config is: ' + 'user=' + config.user + ', pswd=' + config.password + ', server=' + config.server + ', db=' + config.database + '\n')
  
  console.log('deleteActiveSessionKey: trying to connect...' + '\n');  
  sql.connect(config, function (err) {
    if (err !== null) {
      console.log(err);
    };
  
    var request = new sql.Request();
    request.input('ActiveSessionKey', sql.Int, 0);
    request.execute('syActiveSessionsDeleteAP')
      .then( function(recordsets) {
        console.log('deleted session: ' + sessionKey + '\n');
      })
      .catch(function (err) {
        console.log(err);
      });

    sql.close();
  });
*/

};


// get database list from server
function getDBList(config, event) {
  var sql = require('mssql');
  var options = '';

  sql.connect(config, function (err) {
    if (err !== null) {
      console.log(err);
    };

    new sql.Request()
    .query('Select [name] from master.dbo.sysdatabases where dbid > 4 order by [name]')
    .then(function(recordset) {
        populateDBSelector(event, recordset);
        // console.dir(recordset);
      })
    .catch(function(err) {
        console.log(err);
      });

    
    sql.close();

  });


};

// reply that we have finished our connection test
function populateDBSelector (event, dbList) {
  event.sender.send('populateDBSelector', dbList);
};


exports.testConn = testConn;
exports.testConnV8 = testConnV8;
exports.getActiveSessionKey = getActiveSessionKey;
exports.deleteActiveSessionKey = deleteActiveSessionKey;
//exports.getDBList = getDBList;
