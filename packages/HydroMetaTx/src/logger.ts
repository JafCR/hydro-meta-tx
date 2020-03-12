const bunyan = require('bunyan')
const path = require('path')


const debug = "debug"
class Logger {
    level: string
    directory: string
    prefix: string

    constructor(options?: Logger.Options) {
        console.log('Logger options: ', options)
        options = options || <Logger.Options>{}
        this.level = options.level || "info"
        this.directory = options.directory || path.resolve(__dirname, "..")
        this.prefix = options.prefix || ""
        console.log(this)
    }

    getLogger() {
        const log = bunyan.createLogger({
            name: 'Relayer',
            streams: [
                {
                    level: this.level,
                    stream: process.stdout
                },
                {
                    level: 'fatal',
                    path: path.resolve(this.directory, this.prefix + "logs-fatal.json")
                },
                {
                    level: 'debug',
                    path: path.resolve(this.directory, '..', this.prefix + "logs-debug.json")
                }
            ]
        })
        console.log('Logger options: ', log)
        return log
    }
}

module.exports = Logger
