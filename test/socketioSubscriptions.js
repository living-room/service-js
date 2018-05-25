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

  let { address, family } = t.context.app.address()
  t.context.socket = io.connect(`http://[${address}]:${port}`)
})

test.cb('subscribe returns assertions and retractions', t => {
  const socket = t.context.socket
  const gorogstart = 'gorog is at 0.5, 0.7'
  const gorogmove = 'gorog is at 0.8, 0.4'
  const gorogstartparsed = {name: {word: "gorog"}, x: {value: 0.5}, y:{value: 0.7}}
  const gorogmoveparsed = {name: {word: "gorog"}, x: {value: 0.8}, y:{value: 0.4}}

  const subscription = ['$name is at $x, $y']

  socket.on(JSON.stringify(subscription), ({assertions, retractions}) => {
    if (t.context.timesChanged === 0) {
      t.deepEqual([gorogstartparsed], assertions)
      t.deepEqual([], retractions)
      t.end()
    }
    t.context.timesChanged++
  })

  setTimeout(() => socket.emit('assert', [gorogstart]), 10)
})

test.cb('multisubscribe', t => {
  const socket = t.context.socket
  const subscription = [
    '$name has speed ($dx, $dy)',
    '$name is at ($x, $y)'
  ]

  const facts = ['gorog has speed (1, 2)', 'gorog is at (0.5, 0.5)']

  socket.emit('subscribe', subscription, acknowledge => {
    if (acknowledge != subscription) throw new Error(`subscription to ${subscription} failed`)
    socket.on(JSON.stringify(subscription), ({assertions, retractions}) => {
      if (t.context.timesChanged === 0) {
        t.deepEqual([], assertions)
        t.deepEqual([], retractions)
        t.end()
      }
      t.context.timesChanged++
    })
  })

  setTimeout(() => socket.emit('assert', [facts[0]]), 10)
  setTimeout(() => socket.emit('assert', [facts[1]]), 50)
})
