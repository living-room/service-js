const Socket = require('koa-socket')
const io = new Socket({})
const mdns = require('mdns')

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
  const serviceType = mdns.makeServiceType('socketio', 'tcp', 'livingroom')
  const ad = mdns.createAdvertisement(serviceType, 3000)

  io.use(async (context, next) => {
    context.client = client
    context.subscriptions = subscriptions
    context.ad = ad
    await next()
  })

  ad.start() // should really be on listen()
  io.attach(app)
  return app
}
