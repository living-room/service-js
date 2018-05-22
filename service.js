const Database = require('@living-room/database-js')
const room = new Database()
const pickPort = require('pick-port')
const socketio = require('./src/services/socketio')
const osc = require('./src/services/osc')

module.exports = {
  async listen(port, oscport, cb) {
    port = port || await pickPort({type: 'tcp'})
    oscport = oscport || await pickPort()

    const socketioClient = room.client('socketio')
    const socketioOptions = {
      app: require('./src/services/httpserver'),
      port,
      verbose: false
    }
    const socketioService = socketio.create(socketioClient, socketioOptions)

    const oscClient = room.client('osc')
    const oscOptions = { oscport }
    const oscService = osc.create(oscClient, oscOptions)

    const { ServiceManager } = require('./src/living-room-services')
    const manager = new ServiceManager(...socketioService, oscService)

    process.on('SIGINT', () => {
      console.log()
      console.log(`see you later, space surfer...`)
      process.exit(0)
    })

    return { port, oscport }
  }
}
