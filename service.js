const Database = require('@living-room/database-js')
const room = new Database()
const pickPort = require('pick-port')

const SocketIOService = require('./src/services/socketio')
const OscService = require('./src/services/osc')
const { ServiceManager } = require('./src/manager')

module.exports = {
  async listen (port, oscport) {
    const client = room.client('socketio')

    const socketio = new SocketIOService({
      room: client,
      verbose: false,
      port: port || (await pickPort({ type: 'tcp' }))
    })

    const osc = new OscService({
      room: client,
      port: oscport || (await pickPort())
    })

    socketio.listen()
    osc.listen()
    const manager = new ServiceManager(...socketio._services, ...osc._services)

    process.on('SIGINT', () => {
      console.log()
      console.log(`see you later, space surfer...`)
      process.exit(0)
    })
  }
}
