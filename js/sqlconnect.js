var sqlconn = function() {

    var sql = require("mssql");
    var config = {
    user: 'aris',
    password: 'Datdbmae(@360)',
    server: 'WS08TEST',
    database: 'RA_Envision'
    };

    sql.connect(config, function (err) {
        if (err !== null) {
            console.log(err);
        }
    });
};

module.exports = sqlconn;
