/*
 * winston-googlecloud
 *
 * (C) 2016 Simon Clériot
 * MIT LICENCE
 *
 */

var util = require('util'),
    winston = require('winston');

var GoogleCloudLogging = winston.transports.GoogleCloudLogging = function (options) {
  this.name = 'GoogleCloudLogging';

  this.level = options.level || 'info';

  options.gcl_project_id = options.gcl_project_id || "";
  options.gcl_key_filename = options.gcl_key_filename || "";

  var gcloud = require('gcloud')({
      projectId: options.gcl_project_id,
      keyFilename: options.gcl_key_filename
  });

  this.logging = gcloud.logging();
  this.gcl_resource = {
      type: 'global',
      labels: {
        project_id: 'captiz-1099'
    }
  };

  if(process.env.ENVIRONMENT == "PRODUCTION"){
      this.log_bucket = this.logging.log('captiz-platform-prod');
  }
  else {
      this.log_bucket = this.logging.log('captiz-platform-preprod');
  }

  this.logs_queue = [];
  this.sending = false;
};

util.inherits(GoogleCloudLogging, winston.Transport);

GoogleCloudLogging.prototype.log = function (level, msg, meta, callback) {
  console.log(msg);

  var data = {
      message: msg,
      level: level,
      data: meta
  };
  var entry = this.log_bucket.entry(this.gcl_resource, data);

  var fn = function(err, apiResponse) {
      if (err) {
        console.log(err);
        console.log(apiResponse);
      }
      else {
          //console.log(apiResponse);
      }
  };

  if(level == "verbose" || level == "info"){
      entry.severity = 'INFO';
  }
  else if(level == "debug" || level == "silly"){
      entry.severity = 'DEBUG';
  }
  else if(level == "warn"){
      entry.severity = 'WARNING';
  }
  else if(level == "error"){
      entry.severity = 'ERROR';
  }

  this.logs_queue.push(entry);
  if(!this.sending){
      this.sending = true;
      var self = this;
      setTimeout(function(){
          self.sending = false;

          if(self.logs_queue.length > 0){
              self.log_bucket.write(self.logs_queue, function(err, apiResponse) {
                  if (err) {
                    console.log(err);
                    console.log(apiResponse);
                  }
                  else {
                  }
              });
              self.logs_queue.length = 0;
          }
      }, 500);
  }

  return callback(null, true);
};
