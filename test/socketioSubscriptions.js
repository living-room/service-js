import test from 'ava'
import io from 'socket.io-client'
import pickPort from 'pick-port'
import Database from '@living-room/database-js'
import SocketIOService from '../src/services/socketio.js'

test.beforeEach(async t => {
  const room = new Database()
  const port = await pickPort()
  const socketservice = new SocketIOService({
    room: room.client('socketio'),
    verbose: true,
    port
  })
  t.context.app = await socketservice.listen()
  t.context.timesChanged = 0
  const { address } = t.context.app.address()
  t.context.socket = io.connect(`http://[${address}]:${port}`)
})

test.afterEach(async t => {
  t.context.app.close()
})

test('subscribe returns assertions and retractions', t => {
  return new Promise((resolve, reject) => {
    const socket = t.context.socket
    const gorogstart = 'gorog is at 0.5, 0.7'
    const gorogstartparsed = { name: { word: 'gorog' }, x: { value: 0.5 }, y: { value: 0.7 } }
    const subscription = ['$name is at $x, $y']

    socket.on(JSON.stringify(subscription), ({ assertions, retractions }) => {
      if (t.context.timesChanged === 0) {
        t.deepEqual([], assertions)
        t.deepEqual([], retractions)
      } else if (t.context.timesChanged === 1) {
        t.deepEqual([gorogstartparsed], assertions)
        t.deepEqual([], retractions)
        resolve()
      }
      t.context.timesChanged++
    })

    socket.emit('subscribe', subscription, acknowledge => {
      t.deepEqual(acknowledge, subscription)
    })

    setTimeout(() => socket.emit('assert', [gorogstart]), 10)
  })
})

test('multisubscribe', t => {
  return new Promise((resolve, reject) => {
    const socket = t.context.socket
    const subscription = [
      '$name has speed ($dx, $dy)',
      '$name is at ($x, $y)'
    ]

    const facts = ['gorog has speed (1, 2)', 'gorog is at (0.5, 0.5)']

    socket.on(JSON.stringify(subscription), ({ assertions, retractions }) => {
      if (t.context.timesChanged === 0) {
        t.deepEqual([], assertions)
        t.deepEqual(retractions, [])
      } else if (t.context.timesChanged === 1) {
        t.deepEqual(assertions, [{
          name: { word: 'gorog' },
          dx: { value: 1 },
          dy: { value: 2 },
          x: { value: 0.5 },
          y: { value: 0.5 }
        }])
        t.deepEqual([], retractions)
        resolve()
      }
      t.context.timesChanged++
    })

    socket.emit('subscribe', subscription, acknowledge => {
      t.deepEqual(acknowledge, subscription)
      // FIXME: how come socket.on() doesn't work here?
    })

    setTimeout(() => socket.emit('assert', [facts[0]]), 10)
    setTimeout(() => socket.emit('assert', [facts[1]]), 50)
  })
})
