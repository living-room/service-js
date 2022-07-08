import Database from '@living-room/database-js'
import pickPort from 'pick-port'

import SocketIoService from './src/services/socketio.js'
import OscService from './src/services/osc.js'
import { ServiceManager } from './src/manager.js'

export default class LivingRoomService {
  constructor ({ verbose, port, oscport } = { verbose: false }) {
    const room = new Database()
    this.verbose = verbose
    this.port = port
    this.oscport = oscport
    this.room = room.client()
  }

  async listen ({ verbose } = { verbose: true }) {
    this.port = this.port || (await pickPort({ type: 'tcp' }))
    this.oscport = this.oscport || (await pickPort())

    const osc = new OscService({
      room: this.room,
      port: this.oscport,
      verbose
    })

    const socketio = SocketIoService({
      room: this.room,
      port: this.port,
      verbose
    })

    this.manager = new ServiceManager({ verbose, services: [osc, socketio].map(({ service }) => service) })

    process.on('SIGINT', () => {
      console.log()
      console.log('see you later, couch surfer...')
      process.exit(0)
    })

    return new Promise((resolve) => {
      resolve({ port: this.port, oscport: this.oscport })
    })
  }

  close () {
    this.manager.close()
  }
}
