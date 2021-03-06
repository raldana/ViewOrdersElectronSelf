const chokidar = require('chokidar');
const fs = require('fs');
const fsPath = require('path');

let fileCopyDelaySeconds = 2;

const watchFile = function(event, watchedFile) {
    var watchedBaseName = fsPath.basename(watchedFile);
    var folder = require('path').dirname(watchedFile);

    // Initialize watcher.
    var watcher = chokidar.watch('file', {
        ignored: /[\/\\]\./,
        persistent: true,

        ignoreInitial: true,
        followSymlinks: true,
        //cwd: '.',

        usePolling: true,
        interval: 100,
        binaryInterval: 300,
        alwaysStat: true,
        depth: 99,

        awaitWriteFinish: true

/*
        awaitWriteFinish: {
            stabilityThreshold: 3000,
            pollInterval: 100
        }
*/        
        //atomic: true
    });

    // Something to use when events are received.
    var log = console.log.bind(console);
    // Add event listeners.
    watcher
    .on('all', function(fsevent, path) {
        if (fsevent == "add" || fsevent == "change") {
            fs.stat(path, function (err, stat) {
                if (err){
                    console.log('Error watching file for copy completion. ERR: ' + err.message);
                    console.log('Error file not processed. PATH: ' + path);
                } else {
                    setTimeout(checkFileCopyComplete, fileCopyDelaySeconds*1000, path, stat, event);
                    watcher.unwatch(path);
                    watcher.close();
                    //console.log('File copy completed...');
                }
            });
            event.sender.send('watchFileReply', path);
        }
    })

    // Watch new files.
    watcher.add(watchedFile);
    
    // Get list of actual paths being watched on the filesystem
    var watchedPaths = watcher.getWatched();
};

const copyFile = function (event, source, target) {
  var cbCalled = false;
  
  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
      copyOk = false;
      done(err, "createReadStream");
  });
  rd.on('open', function () {
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        done(err, "createWriteStream");
    });
    wr.on("close", function(ex) {
        done();
    });
    rd.pipe(wr);
  });

  function done(err, methodName) {
    rd.close();
    if (err) {
      console.log("error in " + "[" + methodName + "]" + " method" + "\n");
      console.log(err);  
    } else {
        if (!cbCalled) {
        // delete remote file after copying it
        deleteFile(null, source);
        event.sender.send('copyFileReply', target);
        cbCalled = true;
      }
    }
  }

};

const deleteFile = function (event, target) {
    if (target) {
        try {
            if (fs.existsSync(target)) {
                console.log("fsfuncs.deleteFile() Deleting file " + target + "..." );
                fs.unlinkSync(target);
                console.log("file " + target + " deleted");
            } else {
                console.log("fsfuncs.deleteFile() " + target + "doesn't exist" +"\n");
            }
        } catch (err) {
            if (err == 'EPERM') {
                console.log('could not delete file ' + target + '\n');
            } else {
                if (err.code != 'ENOENT') {
                    console.log('deleteFile( ) ' + err.code + '\n');
                } else {
                    //console.log('deleteFile( ) - ' + target + ' does not exist' + '\n');
                }
            };
        };
    };

    if (event) {
        event.sender.send('deleteFileReply', target);
    };
};

const fileExists = function(event, target) {
    var isExists = false;

    fs.stat(target, function(err, fileStat) {
        if (err) {
            if (err.code == 'ENOENT') {
                console.log(target + ' does not exist' + '\n');
            }else {
                console.log(target + ' - ' + err.code + '\n');
            }
        } else
            if (fileStat.isFile()) {
                isExists = true;
        }
    });

  return isExists;
};

// Makes sure that the file added to the directory, but may not have been completely copied yet by the
// Operating System, finishes being copied before it attempts to do anything with the file.
function checkFileCopyComplete(path, prev, event) {
    fs.stat(path, function (err, stat) {

        if (err) {
            if (err.code != 'ENOENT') {
                console.log(" error - checkFileCopyComplete() - " + err.code)
            }
        }
        if (stat && prev) {
            if (stat.mtime.getTime() === prev.mtime.getTime()) {
                event.sender.send('watchFileReply', path);
            }
        }
        else {
            setTimeout(checkFileCopyComplete, fileCopyDelaySeconds*1000, path, stat, event);
        }
    });
}

exports.watchFile = watchFile;
exports.copyFile = copyFile;
exports.deleteFile = deleteFile;
exports.fileExists = fileExists;

