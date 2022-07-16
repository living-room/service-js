import { makeService } from '../manager.js'
import util from 'util'
import { hostname } from 'os'
import nbonjour from 'nbonjour'
import { Server } from 'socket.io'

export default function SocketIoService ({ room, port, verbose }) {
  const io = new Server()

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
    return io.listen(port)
  }

  return { service, listen }
}

const log = async ([event, ...data], next) => {
  const payload = util.inspect(data) ?? ''
  console.log(`<-  ${event ?? ''} ${payload}`)
  await next()
  console.log(` -> ${event ?? ''} ${payload}`)
}
