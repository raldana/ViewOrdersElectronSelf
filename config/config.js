// user name field must be "userID" - if "userName" is used, it returns Windows user name (i.e. RickA)
module.exports = {
    sqlServerAddress: 'AZ-SQL19TEST-01',
    dbName: 'Envision',
    userID: 'aris',
    userPswd: 'Datdbmae(@360)',
    port: 1433,
    docOriginServerAddress: 'AZ-WIN19TEST-01',
    connectionTimeOut: 60000,
    encrypt: false
}; 
/*
    sqlServerAddress: 'AZ-SQL19TEST-01',
    dbName: 'Envision',
    userID: 'aris',
    userPswd: 'Datdbmae(@360)',
*/

/*
####################
#A360
####################
10.1.1.10	AZ-SQL19TEST-01
10.1.1.11	AZ-WIN19TEST-01
10.3.1.30	a360alm
10.3.1.12	AZ-FILES-01

# Sotelma
192.168.168.101	ARISSERV

####################
#OneComm
####################
# -- Test Servers
10.2.18.151	BMLNKWENV1VM01
10.2.18.152 BMLNKWENV1VM02

# -- Production
10.2.18.49	BMLNKW360PVM01


####################
#Digicel
####################
172.22.108.55 Digicel.Production


####################
#Progresif
####################
172.22.108.55 Digicel.Production



*/