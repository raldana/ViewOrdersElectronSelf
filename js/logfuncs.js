function logThis(event, message) {
    // if we pass an Error object, message.stack will have all the details, otherwise give us a string
    if (typeof message === 'object') {
      message = message.stack || objToString(message);
    }
  
    console.log('logfuncs.logThis(): ' + message);
  
    // create the message line with current time
    let today = new Date();
    let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
    let dateTime = date + ' ' + time + ' ';
  
    //insert line
    //mainWindow.webContents.executeJavaScript("document.getElementById('logger').insertAdjacentHTML('afterbegin', dateTime + message + '<br>');");

    let logMsg = dateTime + message + '<br>';
    event.sender.send('logThisReply', logMsg);
  }
  
  function objToString(obj) {
    let str = 'Object: ';
    for (var p in obj) {
      if (obj.hasOwnProperty(p)) {
        str += p + '::' + obj[p] + ',\n';
      }
    }
    return str;
  }
  
  exports.logThis = logThis;