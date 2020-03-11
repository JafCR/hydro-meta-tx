const bunyan = require('bunyan')
const path = require('path')


const level = process.env.NODE_LOGGING_LEVEL || "info"
const debug = "debug"
const log = bunyan.createLogger({
    name:'Relayer',
    streams: [
        {
            level,
            stream:process.stdout
        },
        {
            level:'fatal',
            path:path.resolve(__dirname,'..',"logs-fatal.json")
        },
        {
            level:'debug',
            path:path.resolve(__dirname,'..',"logs-debug.json")
        }
    ]
})

module.exports = log
