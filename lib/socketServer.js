const socket = require('koa-socket')
const io = new socket()
const util = require('util')

const client = (app) => async (context, next) => {
  context.state = context.state || { client: null }
  context.state.client = context.state.client ||
    io.state.room.connect(context.data.id)
  console.log(util.inspect(context.state.client))
  await next()
}

const log = () => async (context, next) => {
  console.log(`<- ${context.state.client} ${context.event} ${context.data}`)
  await next()
  console.log(`<- ${context.state.client} ${context.event} ${context.data}`)
}

io.use(client())
io.use(log())

io.on('id', async context => {
  context.socket.emit('id', context.state.client.id)
})

io.on('assert', async ({socket, state, data: facts}) => {
  const response = await state.client.assert(facts[0])
  socket.emit('facts', response)
})

io.on('select', async context => {
  const facts = context.data
  console.log(facts)
  await context.state.client.select(facts)
    .doAll(solutions => {
      console.log(solutions)
      context.socket.emit('solutions', solutions)
    })
})

module.exports = (room, app) => {
  io.state = {room}
  io.attach(app)
  return app
}
