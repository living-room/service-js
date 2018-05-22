// create(client: Room.Client): Service
module.exports = {
  create: (client, { app, port=3000, verbose }) => {
    const Socket = require('koa-socket-2')
    const io = new Socket()

    const { makeService } = require('../living-room-services')

    const hostname = require('os').hostname()
    const services = [
      makeService({
        name: `${hostname}-${port}-living-room-socketio`,
        type: 'http',
        subtype: 'socketio',
        port
      })
    ]

    if (app) {
      services.push(
        makeService({ name: `${hostname}-${port}-living-room-http`, type: 'http', port })
      )
    } else {
      const Koa = require('koa')
      app = new Koa()
    }

    io.attach(app)

    app.context.client = app.context.client || client

    if (verbose) {
      io.use(async (context, next) => {
        console.log(`<- ${context.event} ${context.data}`)
        await next()
        console.log(`<- ${context.event} ${context.data}`)
      })
    }

    const subscriptions = new Set()

    io.use(async (context, next) => {
      context.client = client
      context.subscriptions = subscriptions
      await next()
    })

    io.on('messages', async ({ client, data: facts, acknowledge }) => {
      if (!Array.isArray(facts)) facts = [facts]
      facts.forEach(fact => {
        if (fact.assert) client.assert(fact.assert)
        if (fact.retract) client.retract(fact.retract)
      })
      await client.flushChanges()
      if (acknowledge) acknowledge(facts)
    })

    io.on('assert', async ({ client, data: facts, acknowledge }) => {
      if (!Array.isArray(facts)) facts = [facts]
      facts.forEach(fact => client.assert(fact))
      await client.flushChanges()
      if (acknowledge) acknowledge(facts)
    })

    io.on('retract', async ({ client, data: facts, acknowledge }) => {
      if (!Array.isArray(facts)) facts = [facts]
      facts.forEach(fact => client.retract(fact))
      await client.flushChanges()
      if (acknowledge) acknowledge(facts)
    })

    io.on('select', async ({ data: facts, client, acknowledge }) => {
      await client.select(facts).doAll(acknowledge)
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

    app.listen(services[0].port, async () => {
      const nbonjour = require('nbonjour').create()
      services.forEach(service => {
        nbonjour.publish(service)
      })
    })

    return services
  }
}
