const PORT = parseInt(process.env.PORT || '3000')
const OSC_PORT = parseInt(process.env.OSC_PORT || '41234')

const Database = require('@living-room/database-js')
const room = new Database()

const ServiceManager = require('./src/ServiceManager')
const serviceManager = new ServiceManager()

let app = require('./lib/httpServer.js')(room.client('http'))

require('./lib/socketServer.js')(app, { verbose: false })(room.client('socket')).listen(PORT)

require('./lib/oscServer.js')(room.client('osc')).listen(OSC_PORT)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
