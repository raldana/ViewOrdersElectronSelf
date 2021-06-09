    // logger
    ipcRenderer.on('logThisReply', function(event, logMsg) {
        //logMsgs.push(logMsg);
        return;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - ' + logMsg);
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - logMsgs' + logMsgs);
/*
        let topdoc = document; //.document;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - topdoc ' + JSON.stringify(topdoc));
        let doc = document.getElementById('viewOrderIframe'); //.document;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - doc ' + JSON.stringify(doc));
        let content = doc.contentWindow.document;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - content ' + JSON.stringify(content));
        let logger = content.getElementById("logger");
        logger.insertAdjacentHTML("afterbegin", logMsg);
*/
        // using reference to iframe (ifrm) obtained above
        let ifrm = document.getElementById('viewOrderIframe'); //.document;
        var win = ifrm.contentWindow; // reference to iframe's window
        // reference to document in iframe
        let doc = ifrm.contentDocument? ifrm.contentDocument: ifrm.contentWindow.document;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - doc ' + JSON.stringify(doc));

        let iframeContent = ifrm.contentDocument;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - iframeContent ' + JSON.stringify(iframeContent));
        let iframeContentHTML = ifrm.contentDocument.document.innerHTML;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - iframeContentHTML ' + JSON.stringify(iframeContentHTML));

        let iframeWindowContent = ifrm.contentWindow.document;
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - iframeWindowContent ' + JSON.stringify(iframeWindowContent));

        // reference to form named 'demoForm' in iframe
        var logger = doc.getElementById('logger');
        ipcRenderer.send('consoleLog', 'jsindex.SubmitOrder: got logThisReply - logger ' + JSON.stringify(logger));

        //let iframeDoc = document.getElementById('viewOrderIframe');
        //let iframeBody = iframeDoc.contentWindow.document.body.innerHTML;
        //ipcRenderer.send("consoleLog", "iframe object: " + iframeBody);
        //let logDiv = doc.getElementById('logger');
        //ipcRenderer.send("consoleLog", "iframe object: " + JSON.stringify(iframeBody));
        //doc.open();
        //doc.write(logMsg);
        //doc.close(); 
        //document.getElementById('logger').insertAdjacentHTML('afterbegin', logMsg);
    })
