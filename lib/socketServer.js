const Socket = require('koa-socket')
const io = new Socket({})

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

io.on('select', async ({ client, data: facts, acknowledge }) => {
  await client.select(facts).doAll(acknowledge)
})

io.on('connection', ({ socket, client, subscriptions }) => {
  socket.on('subscribe', patternsString => {
    const patterns = JSON.parse(patternsString)
    const subscription = client.subscribe(patterns, changes => {
      socket.emit(patternsString, changes)
    })
    subscriptions.add(subscription)
  })
})

module.exports = (app, { verbose }) => client => {
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
    context.ad = ad
    await next()
  })

  io.attach(app)

  // FIXME: wrap app.listen to do this
  const name = process.env.LIVING_ROOM_NAME || require('os').hostname()
  const bonjour = require('nbonjour').create()
  bonjour.publish({name, type: 'socketio', protocol: 'tcp', subtypes: ['livingroom'], port: 3000})

  return app
}
