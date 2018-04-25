const Database = require('@living-room/database-js')
const room = new Database()

const socketService = require('./src/SocketService')
  .create(room.client('socket'), { app: require('./src/httpServer'), verbose: false })

const oscService = require('./src/OscService')
  .create(room.client('osc'))

const ServiceManager = require('./src/ServiceManager')
const manager = new ServiceManager(...socketService, oscService)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
