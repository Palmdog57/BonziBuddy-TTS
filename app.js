/**
  * Bonzi Buddy TTS Generator
  * 1) Initialise script and start listener
  * 2) Connect to SAPI4 site and download requested message
  * 3) Transcode message to 8000hz
  * 4) Download and cleanup
  * 
  * @license GPL-3.0
  * @version 1.2
  * @author Thomas Stephen Palmer
**/

//Import required modules
const https = require('https');
const fs = require('fs');
var sox = require('sox');
var express = require('express')
var md5 = require('md5');
var moment = require('moment');
var mysql  = require('mysql');
const nanoid = require('nanoid')
const config = require('./config.json');
var colors = require('colors');
const SimpleNodeLogger = require('simple-node-logger'),
    opts = {
        logFilePath:'./bonziBuddy.log',
        timestampFormat:'DD-MM-YYY HH:mm:ss.SSS'
    },

log = SimpleNodeLogger.createSimpleLogger( opts );

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : config.username,
  password : config.password,
  database : 'bonziBuddy'
});

connection.on('connect', function(){
  log.info("Connection to mysql established");
});

connection.connect();

// Setup some global variables
var today = moment().format();
const port = 6969;

// Initialize the listener!
var app = express()

app.listen(port, function () {
  log.info('Listening on port '+port);
})

//Setup SAPI4 variables
var voice = "Adult%20Male%20%232%2C%20American%20English%20(TruVoice)";
var pitch = "140";
var speed = "157";

// Download the TTS from SAPI4
function download(url, dest, callback) {
  log.info("*** Received TTS request from user ***");
  var file = fs.createWriteStream(dest);
  var request = https.get(url, async function(response) {
    response.pipe(file);
    file.on('finish', function () {
      file.close(callback); // close() is async, call callback after close completes.
    });
    file.on('error', function (err) {
      fs.unlink(dest); // Delete the file async.
      if (callback)
        callback(err.message);
    });
  });
}

// Triggered when the user sets params
app.get('/play', function (req, res) {
    var message = req.query.text;
    var SAPI4 = "https://tetyys.com/SAPI4/SAPI4?text=" + message + "&voice=" + voice + "&pitch=" + pitch + "&speed=" + speed;
    
    //Setup filenames
    var dateString = md5(today);
    var fileToBeDeleted = 'TTS/'+dateString+'.wav';

    var encryption = md5(message);
    var encryptedFilename = 'TTS/'+encryption+'.wav';

    // Trigger the downloading using above params
    download(SAPI4, fileToBeDeleted, function(err){
        if(err){
            log.error("*** Error downloading TTS ***");
            log.error(err);
        }else{
            log.info("*** Download complete ***");
            job.start();
        }
    });

    // Make the audio usable by asterisk
    var job = sox.transcode(fileToBeDeleted, encryptedFilename, {
        sampleRate: 8000,
        format: 'wav',
        channelCount: 1,
        bitRate: 192 * 1024,
        compressionQuality: 5,
    });
    job.on('error', function(err) {
      job.statusCode = 500;  
      console.error(today + job.statusCode + " - uWu I made a fucky: ");
      log.error(err);
    });
    job.on('end', function() {
        log.info("*** File has been transcoded ***");
        log.info("*** Sending to User ***");
        res.setHeader('content-type', 'audio/wav');
        res.download(encryptedFilename);
        fs.unlinkSync(fileToBeDeleted)
        
        connection.query(`INSERT INTO bonziBuddy.SAPI4 (ttsMessage, voice, filename, timestamp) VALUES ('${message}', 'bonzi', '${encryptedFilename}', '${today}')`, function(error, results, fields){
          if(error) {
            connection.statusCode = 418;
            console.error(today + connection.statusCode + " - uWu I made a fucky: ");
            log.error(err);
          }else{
            log.info("*** mySQL records inserted ***");
          }
        });
        
        connection.end();
        
        log.info("Done.");
    });

});
