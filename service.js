import Database from '@living-room/database-js.js'
import pickPort from 'pick-port'

import SocketIOService from './src/services/socketio.js'
import OscService from './src/services/osc.js'
import { ServiceManager } from './src/manager.js'

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
      console.log('see you later, space surfer...')
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

const listen = async options => {
  const service = new LivingRoomService()
  await service.listen(options)
  return service
}

export { listen, LivingRoomService }
