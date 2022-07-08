import { makeService } from '../manager.js'
import util from 'util'
import { hostname } from 'os'
import nbonjour from 'nbonjour'
import { Server } from 'socket.io'

export default function SocketIoService ({ room, port, verbose }) {
  const io = new Server()

  if (verbose) io.use(log)

  io.on('connection', (socket) => {
    socket.on('ping', (p) => socket.emit('pong', p + 1))

    socket.on('assert', (data) => {
      room.assert(data)
      room.flushChanges()
    })
    socket.on('retract', (data) => {
      room.retract(data)
      room.flushChanges()
    })
    socket.on('flush', () => room.flushChanges())

    socket.on('select', context => {
      room.select(context.data).doAll(assertions => {
        context.data = assertions
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
    io.listen(port)
    nbonjour.create().publish(service)
  }

  return { service, listen }
}

const log = async ({ event, data }, next) => {
  const payload = util.inspect(data) ?? ''
  console.log(`<-  ${event ?? ''} ${payload}`)
  await next()
  console.log(` -> ${event ?? ''} ${payload}`)
}
