'use strict';

var nconf = module.exports = require('nconf');
var path = require('path');

nconf
  // 1) Get command-line arguments
  .argv()
  // 2) Set Environment variables
  .env([
    'DATA_BACKEND',
    'GCLOUD_PROJECT',
    'PORT'
  ])
  // 3) Load config file
  .file({ file: path.join(__dirname, 'config.json') })
  // 4) Set defaults
  .defaults({
    DATA_BACKEND: 'datastore',
    GCLOUD_PROJECT: 'homeo-1295',
    // Port the HTTP server
    PORT: 8080
  });

// Check for required settings
checkConfig('GCLOUD_PROJECT');


function checkConfig (setting) {
  if (!nconf.get(setting)) {
    throw new Error('You must set the ' + setting + ' environment variable or' +
      ' add it to config.json!');
  }
}
