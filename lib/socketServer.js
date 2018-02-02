const socket = require('koa-socket')
const io = new socket()
const util = require('util')

const opts = require('minimist')(process.argv.slice(2));

const client = (app) => async (context, next) => {
  context.state = context.state || { client: null }
  context.state.client = context.state.client ||
    io.state.room.connect(context.data.id)
    if (opts.verbose) {
      console.log(util.inspect(context.state.client))
    }
  await next()
}

const log = () => async (context, next) => {
  console.log(`<- ${context.state.client} ${context.event} ${context.data}`)
  await next()
  console.log(`<- ${context.state.client} ${context.event} ${context.data}`)
}

io.use(client())
if (opts.verbose) {
  io.use(log())
}

io.on('id', async context => {
  context.socket.emit('id', context.state.client.id)
})

io.on('assert', async ({socket, state, data: facts}) => {
  const response = await state.client.assert(facts[0])
  socket.emit('facts', response)
})

io.on('retract', async ({socket, state, data: facts}) => {
  const response = await state.client.retract(facts[0])
  socket.emit('facts', response)
})

io.on('select', async context => {
  const facts = context.data
  await context.state.client.select(facts)
    .doAll(solutions => {
      context.socket.emit('solutions', solutions)
    })
})

io.on('connection', ({ socket }, id) => {
    const client = io.state.room.connect(id)
    let queries = null
    let timeout = null

    socket.on('updateSubscription', (msg) => {
        queries = msg
    })

    socket.on('disconnect', () => {
        clearTimeout(timeout)
        // client.disconnect()
    })

    // TODO: fire this on assert/retract, not by polling
    const loop = () => {
        if (queries) {
            client.select(queries).doAll((res) => {
                socket.emit('subscriptionFacts', res)
            })
        }

        let timeout = setTimeout(loop, 10)
    }

    loop()
})

module.exports = (room, app) => {
  io.state = {room}
  io.attach(app)
  return app
}
