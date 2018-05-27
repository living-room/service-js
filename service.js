const Database = require('@living-room/database-js')
const pickPort = require('pick-port')

const SocketIOService = require('./src/services/socketio')
const OscService = require('./src/services/osc')
const { ServiceManager } = require('./src/manager')

class LivingRoomService {
  constructor ({ verbose, port, oscport } = { verbose: false }) {
    const room = new Database()
    this.verbose = verbose
    this.port = port
    this.oscport = oscport
    this.room = room.client('socketio')
  }

  async listen ({ verbose } = { verbose: true }) {
    this.port = this.port || (await pickPort({ type: 'tcp' }))
    this.oscport = this.oscport || (await pickPort())

    this.socketio = new SocketIOService({
      room: this.room,
      port: this.port,
      verbose
    })

    this.osc = new OscService({
      room: this.room,
      port: this.oscport,
      verbose
    })
    this.socketioapp = await this.socketio.listen()
    this.oscapp = await this.osc.listen()
    this.manager = new ServiceManager({
      verbose,
      services: [...this.socketio._services, ...this.osc._services]
    })

    process.on('SIGINT', () => {
      console.log()
      console.log(`see you later, space surfer...`)
      process.exit(0)
    })

    return new Promise((resolve, reject) => {
      resolve({ port: this.port, oscport: this.oscport })
    })
  }

  close () {
    this.manager.close()
  }
}

const listen = async (options) => {
  const service = new LivingRoomService()
  await service.listen(options)
  return service
}

module.exports = { listen, LivingRoomService }
