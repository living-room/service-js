import { makeService } from '../manager.js'
import util from 'util'
import { hostname } from 'os'
import nbonjour from 'nbonjour'
import { Server } from 'socket.io'
import HttpService from './http.js'
import { createServer } from 'http'

export default function SocketIoService ({ room, port, verbose }) {
  const app = new HttpService({ room, port, verbose })
  const httpServer = createServer(app.callback())
  const io = new Server(httpServer, {
    cors: { origin: 'http://localhost:5000' }
  })

  io.on('connection', (socket) => {
    if (verbose) socket.use(log)

    socket.on('ping', (ping) => socket.emit('pong', ping + 1))

    socket.on('assert', (data) => {
      if (verbose) console.log(`asserting ${util.inspect(data)}`)
      room.assert(data).flushChanges()
    })
    socket.on('retract', (data) => room.retract(data).flushChanges())
    socket.on('flush', () => room.flushChanges())

    socket.on('select', (selection, cb) => {
      room
        .select(selection)
        .doAll(assertions => {
          cb(assertions)
        })
    })

    socket.on('subscribe', (event, acknowledgement) => {
      acknowledgement?.(event)
      room.subscribe(...event, changes => socket.emit(event, changes))
    })
  })

  const service = makeService({
    name: `${hostname()}-${port}-living-room-socketio`,
    type: 'http',
    subtype: 'socketio',
    port
  })

  const listen = () => {
    nbonjour.create().publish(service)
    return httpServer.listen(port)
  }

  return { service, listen }
}

const log = async ([event, ...data], next) => {
  const payload = util.inspect(data) ?? ''
  console.log(`[sio] <- ${event ?? ''} ${payload}`)
  await next()
  console.log(`[sio] -> ${event ?? ''} ${payload}`)
}
