var bunyan = require('bunyan');
var path = require('path');
var level = process.env.NODE_LOGGING_LEVEL || "info";
var debug = "debug";
var logger = bunyan.createLogger({
    name: 'Relayer',
    streams: [
        {
            level: level,
            stream: process.stdout
        },
        {
            level: 'debug',
            path: path.resolve(__dirname, '..', "logs-error.json")
        }
    ]
});
module.exports = logger;
