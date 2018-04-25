const Socket = require('koa-socket')
const io = new Socket({})
const mdns = require('mdns')

const log = () => async (context, next) => {
  console.log(`<- ${context.event} ${context.data}`)
  await next()
  console.log(`<- ${context.event} ${context.data}`)
}

io.on('assert', async ({ socket, data: facts, acknowledge }) => {
  if (!Array.isArray(facts)) facts = [facts]
  facts.forEach(fact => io.state.client.assert(fact))
  await io.state.client.flushChanges()
  if (acknowledge) acknowledge(facts)
})

io.on('retract', async ({ socket, data: facts, acknowledge }) => {
  if (!Array.isArray(facts)) facts = [facts]
  facts.forEach(fact => io.state.client.retract(fact))
  await io.state.client.flushChanges()
  if (acknowledge) acknowledge(facts)
})

io.on('select', async ({ socket, data: facts, acknowledge }) => {
  await io.state.client.select(facts).doAll(acknowledge)
})

io.on('connection', ({ socket, state }) => {
  const { client, subscriptions } = io.state

  socket.on('subscribe', patternsString => {
    const patterns = JSON.parse(patternsString)
    const subscription = client.subscribe(patterns, changes => {
      socket.emit(patternsString, changes)
    })
    subscriptions.add(subscription)
  })
})

module.exports = (app, { verbose }) => client => {
  if (verbose) io.use(log())

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
