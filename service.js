import Database from '@living-room/database-js'
import pickPort from 'pick-port'

import SocketIoService from './src/services/socketio.js'
import OscService from './src/services/osc.js'
import { ServiceManager } from './src/manager.js'

export default class LivingRoomService {
  constructor ({ verbose, port, oscport } = { verbose: true }) {
    const room = new Database()
    this.verbose = verbose
    this.port = port
    this.oscport = oscport
    this.room = room.client()
  }

  async listen ({ verbose } = { verbose: true }) {
    const services = []
    this.port = this.port || (await pickPort({ type: 'tcp' }))
    const socketio = SocketIoService({
      room: this.room,
      port: this.port,
      verbose
    })
    services.push(socketio.service)
    this.socketioapp = socketio.listen()

    this.oscport = this.oscport || (await pickPort())
    const osc = new OscService({
      room: this.room,
      port: this.oscport,
      verbose
    })
    services.push(osc.service)
    this.oscapp = osc.listen()

    this.manager = new ServiceManager({ verbose, services })

    process.on('SIGINT', this.close)

    return new Promise((resolve) => {
      resolve({ port: this.port, oscport: this.oscport })
    })
  }

  close () {
    const farewell = 'see you later, couch surfer'
    console.log()
    process.stdout.write(`\r${farewell}`)
    this.manager.close()
    process.stdout.write(`\r${farewell}.`)
    this.socketioapp.close()
    process.stdout.write(`\r${farewell}..`)
    this.oscapp.close()
    process.stdout.write(`\r${farewell}...`)
    process.exit(0)
  }
}
