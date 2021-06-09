const fs = require('fs');

function checkForFile(fileName) {

    try {
        fs.existsSync(fileName, fs.constants.F_OK && fs.constants.W_OK);
        //return true;
        console.log("file exists");
    } catch (err) {
        //return false;
        console.log("file not found");
    }
}

checkForFile("\\AZ-WIN19TEST-01\DOUser\Output\PrintImages\RemoteJobs\test.txt");

exports.checkForFile = checkForFile;