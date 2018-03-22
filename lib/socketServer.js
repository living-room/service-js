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

const opts = require('minimist')(process.argv.slice(2))

const log = () => async (context, next) => {
  console.log(`<- ${context.event} ${context.data}`)
  await next()
  console.log(`<- ${context.event} ${context.data}`)
}

if (opts.verbose) {
  io.use(log())
}

const flushChangesAndNotifySubscribers = async () => {
  const { client, subscriptions } = io.state
  const currentSolutions = new Map()
  const updatedSolutions = new Map()

  // look at all the matches before and after this assert
  subscriptions.forEach((subscribers, selection) => {
    client.select(selection).doAll(solutions => {
      currentSolutions.set(selection, new Set(solutions))
    })
  })

  await client.flushChanges()

  subscriptions.forEach((subscribers, selection) => {
    client.select(selection).doAll(solutions => {
      updatedSolutions.set(selection, new Set(solutions))
    })
  })
  
  subscriptions.forEach((subscribers, selection) => {
    const before = currentSolutions.get(selection)
    const after = updatedSolutions.get(selection)
    const assertions = Array.from(after.difference(before))
    const retractions = Array.from(before.difference(after))

    if (assertions.length + retractions.length) {
      subscribers.forEach(subscriber => {
        if(assertions.length) {
          subscriber.emit('assertions', {selection, assertions} )
        }
        if (retractions.length) {
          subscriber.emit('retractions', {selection, retractions} )
        }
      })
    }
  })
}

io.on('assert', async ({socket, data: facts}) => {
  if (!Array.isArray(facts)) facts = [ facts ]
  // AbstractClient.assert / similar to Array.isArray
  // how come we cannot facts.forEach(io.state.client.assert)
  facts.forEach(f => io.state.client.assert(f))
  await flushChangesAndNotifySubscribers()
  socket.emit('asserted', facts)
})

io.on('retract', async ({socket, data: facts}) => {
  if (!Array.isArray(facts)) facts = [ facts ]
  facts.forEach(f => io.state.client.retract(f))
  await flushChangesAndNotifySubscribers()
  socket.emit('retracted', facts)
})

io.on('select', async context => {
  const facts = context.data
  await io.state.client.select(facts)
    .doAll(solutions => {
      context.socket.emit('solutions', JSON.stringify(solutions))
    })
})

io.on('connection', ({ socket, state }) => {
  const { client, subscriptions } = io.state

  socket.on('subscribe', select => {
    if (subscriptions.has(select)) {
      subscriptions.get(select).add(socket)
    } else {
      subscriptions.set(select, new Set([socket]))
    }
    client.select(select).doAll(solutions => {
      socket.emit('subscribed', { select, solutions })
    })
  })

  socket.on('unsubscribe', select => {
    if (subscriptions.has(select)) {
      subscriptions.get(select).delete(socket)
    }
    socket.emit('unsubscribed', { select })
  })

  socket.on('disconnect', () => {
    subscriptions.forEach(subscription => {
      subscription.delete(socket)
    })
  })
})

module.exports = app => client => {
  const subscriptions = new Map()
  io.state = { client, subscriptions }
  io.attach(app)
  return app
}
