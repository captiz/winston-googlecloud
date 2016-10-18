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
  options.gcl_log_name = options.gcl_log_name || "";

  this.logging = require('@google-cloud/logging')({
      projectId: options.gcl_project_id,
      keyFilename: options.gcl_key_filename
  });

  this.gcl_resource = {
      type: 'global'
  };

  this.log_bucket = this.logging.log(options.gcl_log_name);

  this.logs_queue = [];
  this.sending = false;
};

util.inherits(GoogleCloudLogging, winston.Transport);

GoogleCloudLogging.prototype.log = function (level, msg, meta, callback) {
  var data = {
      message: msg,
      level: level,
      data: meta
  };
  var entry = this.log_bucket.entry(this.gcl_resource, data);

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
      /** Send logs in batch to avoid reaching API limit **/
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
