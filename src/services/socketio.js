const Socket = require('koa-socket-2')
const { makeService } = require('../manager')
const hostname = require('os').hostname()
const HttpService = require('./http')
const util = require('util')

module.exports = class SocketIOService extends HttpService {
  constructor ({ room, port, verbose }) {
    super({ room, port, verbose })
    this.room = this.room || room
    this.port = this.port || port

    const io = new Socket()
    io.attach(this.app)

    if (verbose) {
      io.use(async (context, next) => {
        const requestBody = util.inspect(context.data)
        console.log(`<-  ${context.event} ${requestBody}`)
        await next()
        console.log(` -> ${util.inspect(context.data)}`)
      })
    }

    io.use(async (context, next) => {
      await next()
      if (context.acknowledge) context.acknowledge(context.data)
    })

    io.on('messages', ({ data: facts }) => {
      this.message(facts)
    })

    io.on('assert', ({ data: facts }) => {
      this.assert(facts)
    })

    io.on('retract', ({ data: facts }) => {
      this.retract(facts)
    })

    io.on('select', context => {
      this.select(context.data).doAll(assertions => {
        context.data = assertions
      })
    })

    io.on('subscribe', ({ data, socket }) => {
      room.subscribe(...data, changes => {
        socket.emit(JSON.stringify(data), changes)
      })
    })
  }

  async listen () {
    super.broadcast()
    const port = this.port
    const hostname = require('os').hostname()
    const service = makeService({
      name: `${hostname}-${port}-living-room-socketio`,
      type: 'http',
      subtype: 'socketio',
      port
    })

    const nbonjour = require('nbonjour').create()
    this._services.push(service)
    const app = await this.app.listen(port)
    nbonjour.publish(service)
    return app
  }
}
