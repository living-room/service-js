const Database = require('@living-room/database-js')
const room = new Database()

const socketService = require('./src/services/socketio').create(
  room.client('socket'),
  { app: require('./src/services/httpserver'), verbose: false }
)

const oscService = require('./src/services/osc').create(room.client('osc'))

const { ServiceManager } = require('./src/living-room-services')
const manager = new ServiceManager(...socketService, oscService)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
