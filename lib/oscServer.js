const OSC = require('osc-js')
const osc = new OSC({ plugin: new OSC.DatagramPlugin() })

const log = ({address, args}) => {
  console.dir(address)
  console.dir(args)
}

const send = (address, message) => {
  osc.send(new OSC.Message(address, message))
}

osc.on('/test', async message => {
  log(message)
})

osc.on('/assert', async message => {
  message.args.forEach(fact => {
    osc.context.client.assert(fact)
  })
  await osc.context.client.flushChanges()
})

osc.on('/retract', async message => {
  message.args.forEach(fact => {
    osc.context.client.retract(fact)
  })
  await osc.context.client.flushChanges()
})

osc.on('/select', async message => {
  let facts = message.args
  await osc.context.client.select(facts)
    .doAll(solutions => {
      console.dir(solutions)
      send('/solutions', JSON.stringify(solutions))
    })
})

osc.on('open', () => {
  let queries = null
  let timeout = null

  send('/connection', 'randomid')

  osc.on('updateSubscription', subscriptions => {
    queries = typeof subscriptions === 'string' ? [subscriptions] : subscriptions
  })

  osc.on('close', () => {
    clearTimeout(timeout)
  })

  const loop = async () => {
    if (queries && queries.length > 0) {
      const facts = osc.context.client.select(queries)
      if (await facts.isNotEmpty()) {
        await facts.doAll(solutions => {
          send('/subscriptionFacts', {queries, solutions})
        })
      }
    }

    timeout = setTimeout(loop, 10)
  }

  loop()
})

module.exports = client => {
  osc.context = { client }
  return osc
}
