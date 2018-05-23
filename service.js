const Database = require('@living-room/database-js')
const room = new Database()
const pickPort = require('pick-port')

const SocketIOService = require('./src/services/socketio')
const OscService = require('./src/services/osc')
const { ServiceManager } = require('./src/manager')

module.exports = {
  listen: async ({verbose, port, oscport}={verbose: false}) => {
    const client = room.client('socketio')
    port = port || (await pickPort({ type: 'tcp' }))
    oscport = oscport || (await pickPort())

    const socketio = new SocketIOService({
      room: client,
      port,
      verbose
    })

    const osc = new OscService({
      room: client,
      port: oscport,
      verbose
    })

    const socketioapp = socketio.listen()
    const oscapp = osc.listen()
    const manager = new ServiceManager(...socketio._services, ...osc._services)

    process.on('SIGINT', () => {
      console.log()
      console.log(`see you later, space surfer...`)
      process.exit(0)
    })

    return {
      port,
      oscport
    }
  }
}
