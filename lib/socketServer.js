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
  const currentAssertions = new Map()
  const updatedAssertions = new Map()

  // look at all the matches before and after this assert
  subscriptions.forEach((subscribers, selections) => {
    client.select(selections).doAll(assertions => {
      currentAssertions.set(selections, new Set(assertions))
    })
  })

  await client.flushChanges()

  subscriptions.forEach((subscribers, selections) => {
    client.select(selections).doAll(assertions => {
      updatedAssertions.set(selections, new Set(assertions))
    })
  })

  subscriptions.forEach((subscribers, selections) => {
    const before = currentAssertions.get(selections)
    const after = updatedAssertions.get(selections)
    const assertions = Array.from(after.difference(before))
    const retractions = Array.from(before.difference(after))

    if (assertions.length + retractions.length) {
      subscribers.forEach(subscriber => {
        if(assertions.length) {
          subscriber.emit('assertions', {selections, assertions} )
        }
        if (retractions.length) {
          subscriber.emit('retractions', {selections, retractions} )
        }
      })
    }
  })
}

io.on('assert', async ({socket, data: facts}) => {
  if (!Array.isArray(facts)) facts = [ facts ]
  facts.forEach(fact => io.state.client.assert(fact))
  await flushChangesAndNotifySubscribers()
  socket.emit('asserted', facts)
})

io.on('retract', async ({socket, data: facts}) => {
  if (!Array.isArray(facts)) facts = [ facts ]
  facts.forEach(fact => io.state.client.retract(fact))
  await flushChangesAndNotifySubscribers()
  socket.emit('retracted', facts)
})

io.on('select', async context => {
  const facts = context.data
  await io.state.client.select(facts)
    .doAll(assertions => {
      context.socket.emit('assertions', JSON.stringify(assertions))
    })
})

io.on('connection', ({ socket, state }) => {
  const { client, subscriptions } = io.state

  socket.on('subscribe', select => {
    const selections = select.toString()
    if (subscriptions.has(selections)) {
      subscriptions.get(selections).add(socket)
    } else {
      subscriptions.set(selections, new Set([socket]))
    }
    client.select(select).doAll(assertions => {
      socket.emit('subscribed', { selections })
      socket.emit('assertions', { selections, assertions })
    })
  })

  socket.on('unsubscribe', select => {
    const selections = select.toString()
    if (subscriptions.has(selections)) {
      subscriptions.get(selections).delete(socket)
    }
    socket.emit('unsubscribed', { selections })
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
