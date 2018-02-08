const socket = require('koa-socket')
const io = new socket()
const util = require('util')

const opts = require('minimist')(process.argv.slice(2));

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
    console.log(`state is`, state)

    socket.on('updateSubscription', (msg) => {
        queries = msg
    })

    socket.on('disconnect', () => {
        clearTimeout(timeout)
    })

    // TODO: fire this on assert/retract, not by polling
    const loop = () => {
        if (queries) {
            io.state.client.select(queries).doAll((res) => {
                socket.emit('subscriptionFacts', res)
            })
        }

        let timeout = setTimeout(loop, 10)
    }

    loop()
})

module.exports = (room, app) => {
  io.state = { client: room.connect() }
  io.attach(app)
  return app
}
