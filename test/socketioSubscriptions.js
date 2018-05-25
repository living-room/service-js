import test from 'ava'
import io from 'socket.io-client'
import pickPort from 'pick-port'

test.beforeEach(async t => {
  const Database = require('@living-room/database-js')
  const room = new Database()

  const SocketIOService = require('../src/services/socketio')
  const port = await pickPort()
  const socketservice = new SocketIOService({
    room: room.client('socketio'),
    verbose: true,
    port
  })
  t.context.app = await socketservice.listen()
  t.context.timesChanged = 0

  let { address, port, family } = t.context.app.address()
  t.context.socket = io.connect(`http://[${address}]:${port}`)
})

test.cb('subscribe returns assertions and retractions', t => {
  const socket = t.context.socket
  const gorogstart = 'gorog is at 0.5, 0.7'
  const gorogmove = 'gorog is at 0.8, 0.4'
  const gorogstartparsed = {name: {word: "gorog"}, x: {value: 0.5}, y:{value: 0.7}}
  const gorogmoveparsed = {name: {word: "gorog"}, x: {value: 0.8}, y:{value: 0.4}}

  const initialselections = JSON.stringify('$name is at $x, $y')

  socket.on(initialselections, ({assertions, retractions}) => {
    if (t.context.timesChanged === 0) {
      t.deepEqual([gorogstartparsed], assertions, "asserted:gorogstart:previousassertions")
      t.deepEqual([], retractions, "retracted:gorogstart:previousassertions")
      t.end()
      // FIXME: this never gets called...
    } else if (t.context.timesChanged === 1) {
      t.deepEqual([gorogmoveparsed], assertions, "asserted:gorogmove:assertions")
      t.deepEqual([], retractions, "retracted:gorogmove:assertions")
    }
    t.context.timesChanged++
  })

  setTimeout(() => socket.emit('assert', [gorogstart]), 10)
  setTimeout(() => socket.emit('subscribe', initialselections), 50)
})
