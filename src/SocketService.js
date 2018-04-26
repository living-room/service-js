module.exports = {
  create: (client, {app, verbose}) => {
    const Socket = require('koa-socket')
    const io = new Socket()

    const name = process.env.LIVING_ROOM_NAME || require('os').hostname()

    const services = [require('./util').makeService('socketio', 'tcp')]

    if (app) {
      services.push(require('./util').makeService('http', 'tcp'))
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

    io.on('subscribe', async ({ data: patternsString, socket, client, subscriptions, acknowledge }) => {
      const patterns = JSON.parse(patternsString)
      const subscription = client.subscribe(patterns, changes => {
        socket.emit(patternsString, changes)
      })
      subscriptions.add(subscription)
      if (acknowledge) acknowledge(subscription)
    })

    const bonjour = require('nbonjour').create()

    app.listen(services[0].port, () => {
      for (const service of services) {
        bonjour.publish(service)
      }
    })

    return services
  }
}
