const Socket = require('koa-socket-2')
const { makeService } = require('../manager')
const hostname = require('os').hostname()
const HttpService = require('./http')

module.exports = class SocketIOService extends HttpService {
  constructor ({ room, port, verbose }) {
    super({ room, port, verbose })
    const io = new Socket()

    if (verbose) {
      io.use(async (context, next) => {
        console.log(`<- ${context.event} ${context.data}`)
        await next()
        console.log(`<- ${context.event} ${context.data}`)
      })
    }

    const subscriptions = new Set()

    io.use(async (context, next) => {
      context.client = this.room
      context.subscriptions = subscriptions
      await next()
    })

    io.on('messages', async ({ client, data: facts, acknowledge }) => {
      this.message(facts)
      if (acknowledge) acknowledge(facts)
    })

    io.on('assert', async ({ client, data: facts, acknowledge }) => {
      this.assert(facts)
      if (acknowledge) acknowledge(facts)
    })

    io.on('retract', async ({ client, data: facts, acknowledge }) => {
      this.retract(facts)
      if (acknowledge) acknowledge(facts)
    })

    io.on('select', async ({ data: facts, client, acknowledge }) => {
      this.select(facts)
      if (acknowledge) acknowledge(facts)
    })

    io.on(
      'subscribe',
      async ({
        data: patternsString,
        socket,
        client,
        subscriptions,
        acknowledge
      }) => {
        const patterns = JSON.parse(patternsString)
        const subscription = client.subscribe(patterns, changes => {
          socket.emit(patternsString, changes)
        })
        subscriptions.add(subscription)
        if (acknowledge) acknowledge(subscription)
      }
    )
    io.attach(this.app)
  }

  async listen () {
    super.broadcast()
    const { port } = this.options
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
