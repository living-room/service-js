import test from 'ava'
import { io } from 'socket.io-client'
import pickPort from 'pick-port'
import Database from '@living-room/database-js'
import SocketIOService from '../src/services/socketio.js'

test.beforeEach(async t => {
  const room = (new Database()).client('test')
  const port = await pickPort()

  const service = SocketIOService({ room, port })
  service.listen()

  t.context.client = io(`http://localhost:${port}`)
})

test('it connects', async t => {
  const { client } = t.context
  return new Promise((resolve, reject) => {
    const ping = 7
    client.on('error', reject)
    client.on('pong', (pong) => {
      t.assert(pong === ping + 1)
      resolve()
    })
    client.emit('ping', ping)
  })
})

test('select works', t => {
  const { client } = t.context
  const gorogstart = 'gorog is at 0.5, 0.7'
  const gorogstartparsed = { name: { word: 'gorog' }, x: { value: 0.5 }, y: { value: 0.7 } }
  const selection = '$name is at $x, $y'

  return new Promise((resolve, reject) => {
    client.on('error', reject)
    client.emit('assert', gorogstart)
    client.emit('select', selection, (data) => {
      t.deepEqual([gorogstartparsed], data)
      resolve()
    })
  })
})

test('subscribe returns assertions and retractions', t => {
  const { client } = t.context
  let callbacks = 0
  const gorogstart = 'gorog is at 0.5, 0.7'
  const gorogstartparsed = { name: { word: 'gorog' }, x: { value: 0.5 }, y: { value: 0.7 } }
  const subscription = ['$name is at $x, $y']

  return new Promise((resolve, reject) => {
    client.on('error', reject)

    client.on(subscription, ({ assertions, retractions }) => {
      if (callbacks === 0) {
        t.deepEqual([], assertions)
        t.deepEqual([], retractions)
      }

      if (callbacks === 1) {
        t.deepEqual([gorogstartparsed], assertions)
        t.deepEqual([], retractions)
        resolve()
      }
      callbacks++
    })

    client.emit('subscribe', subscription, acknowledge => {
      t.deepEqual(acknowledge, subscription)
    })

    client.emit('assert', gorogstart)
  })
})

test('multisubscribe', t => {
  let callbacks = 0
  const { client } = t.context

  const subscription = [
    '$name has speed ($dx, $dy)',
    '$name is at ($x, $y)'
  ]

  const facts = ['gorog has speed (1, 2)', 'gorog is at (0.5, 0.5)']

  return new Promise((resolve, reject) => {
    client.on('error', reject)

    client.on(subscription, ({ assertions, retractions }) => {
      if (callbacks === 0) {
        t.deepEqual([], assertions)
        t.deepEqual([], retractions)
      }

      if (callbacks === 1) {
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
      callbacks++
    })

    client.emit('subscribe', subscription, acknowledge => {
      t.deepEqual(acknowledge, subscription)
      client.emit('assert', facts[0])
      client.emit('assert', facts[1])
    })
  })
})
