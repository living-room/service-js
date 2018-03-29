const Socket = require('koa-socket')
const io = new Socket()
let a = 0
// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
Set.prototype.difference = function (setB) {
  var difference = new Set(this)
  for (var elem of setB) {
    difference.delete(elem)
  }
  return difference
}

const log = () => async (context, next) => {
  console.log(`<- ${context.event} ${context.data}`)
  await next()
  console.log(`<- ${context.event} ${context.data}`)
}

io.on('assert', async ({ socket, data: facts }) => {
  if (!Array.isArray(facts)) facts = [facts]
  facts.forEach(fact => io.state.client.assert(fact))
  await io.state.client.flushChanges()
  socket.emit('asserted', facts)
})

io.on('retract', async ({ socket, data: facts }) => {
  if (!Array.isArray(facts)) facts = [facts]
  facts.forEach(fact => io.state.client.retract(fact))
  await io.state.client.flushChanges()
  socket.emit('retracted', facts)
})

io.on('select', async ({socket, data: facts }) => {
  await io.state.client.select(facts).doAll(assertions => {
    socket.emit('assertions', JSON.stringify(assertions))
  })
})

io.on('connection', ({ socket, state }) => {
  const { client, subscriptions } = io.state

  socket.on('subscribe', patterns => {
    subscriptions.add(
      client.subscribe(patterns, changes => {
        socket.emit(JSON.stringify(patterns), changes)
      })
    )
  })
})

module.exports = (app, {verbose}) => client => {
  if (verbose) io.use(log())

  const subscriptions = new Set()
  io.state = { client, subscriptions }
  io.attach(app)
  return app
}
