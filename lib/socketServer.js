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

io.on('assert', async ({socket, state, data: facts}) => {
  const response = await io.state.client.assert(facts[0])
  socket.emit('facts', response)
})

io.on('retract', async ({socket, state, data: facts}) => {
  const response = await io.state.client.retract(facts[0])
  socket.emit('facts', response)
})

io.on('select', async context => {
  const facts = context.data
  await io.state.client.select(facts)
    .doAll(solutions => {
      context.socket.emit('solutions', solutions)
    })
})

io.on('connection', ({ socket, state }) => {
  let queries = null
  let timeout = null

  socket.on('updateSubscription', (msg) => {
    queries = msg
  })

  socket.on('disconnect', () => {
    clearTimeout(timeout)
  })

  const loop = () => {
    if (queries) {
      io.state.client.select(queries).doAll((res) => {
        socket.emit('subscriptionFacts', res)
      })
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
