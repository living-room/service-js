const Socket = require('koa-socket')
const io = new Socket()

const opts = require('minimist')(process.argv.slice(2))

const log = () => async (context, next) => {
  console.log(`<- ${context.event} ${context.data}`)
  await next()
  console.log(`<- ${context.event} ${context.data}`)
}

if (opts.verbose) {
  io.use(log())
}

io.on('assert', async ({socket, data: facts}) => {
  const { client } = io.state
  facts.forEach(fact => client.assert(fact))
  await client.flushChanges()
  socket.emit('assert', JSON.stringify(facts))
})

io.on('retract', async ({socket, data: facts}) => {
  const { client } = io.state
  facts.forEach(fact => client.retract(fact))
  await client.flushChanges()
  socket.emit('retract', JSON.stringify(facts))
})

io.on('select', async context => {
  const facts = context.data
  await io.state.client.select(facts)
    .doAll(solutions => {
      context.socket.emit('solutions', JSON.stringify(solutions))
    })
})

io.on('connection', ({ socket, state }) => {
  let queries = null
  let timeout = null

  socket.emit('connection', 'randomid')

  socket.on('updateSubscription', subscriptions => {
    queries = typeof subscriptions === 'string' ? [subscriptions] : subscriptions
  })

  socket.on('disconnect', () => {
    clearTimeout(timeout)
  })

  const loop = async () => {
    if (queries && queries.length > 0) {
      const facts = io.state.client.select(queries)
      if (await facts.isNotEmpty()) {
        await facts.doAll(solutions => {
          socket.emit('subscriptionFacts', {queries, solutions})
        })
      }
    }

    timeout = setTimeout(loop, 10)
  }

  loop()
})

module.exports = app => client => {
  io.state = { client }
  io.attach(app)
  return app
}
