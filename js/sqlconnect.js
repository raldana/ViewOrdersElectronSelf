const sql = require("mssql");

sql.on("error", err => {
    console.log("mssql error: " + JSON.stringify(err));
})

function buildConfig() {
    let sqlConfig = {};

    let authType = global.sharedObj.authType;
    let userName = global.sharedObj.userName;
    let passwordText = global.sharedObj.userPswd;
    let serverName = global.sharedObj.serverAddress;
    let dbName = global.sharedObj.dbName;
    let dbDriver = global.sharedObj.dbDriver;

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
                database: dbName,
                encrypt: true,
                "options": {
                    "enableArithAbort": true
                }
            };

        };
    };

    return sqlConfig;
};

// get database list from server
function getDBList() {
    (async function () {
        try {
            //let pool = await sql.connect(config)
            let pool = await sql.connect()
            let result = await pool.request()
                .query('Select [name] from master.dbo.sysdatabases where dbid > 4 order by [name]')
              
            let recordsetLength = result.recordsets[0].length;
            let recordset = result.recordsets[0];
            for (i=0; i < recordsetLength; i++) {
                global.sharedObj.dbList.push(recordset[i].name);
            }
//            console.log("sqlconnect.getDBList(): " + JSON.stringify(global.sharedObj.dbList));
        } catch (err) {
            console.log("connfuncs.getDBList() error running query to get db list: " + JSON.stringify(err));
        }
    })()
 };
  

function sqlConn() {
    let connState = false;
    config = buildConfig();
    sql.connect(config)
        .then(pool => {
            connState = true;
            getDBList();
        })
        .catch(err => {
            connState = false;
            console.log(err);
        })

    
    return connState;
};

exports.sqlConn = sqlConn;
