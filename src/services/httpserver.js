const util = require('util')

const Koa = require('koa')
const body = require('koa-body')
const cors = require('@koa/cors')
const route = require('koa-route')
const static_ = require('koa-static')
const stream = require('stream')

const minimist = require('minimist')
const opts = minimist(process.argv.slice(2))

class DBStream extends stream.Readable {
  constructor (client) {
    let assertCb = fact => {
      this.push(`event:assert\ndata:${fact}\n\n`)
    }
    let retractCb = fact => {
      this.push(`event:retract\ndata:${fact}\n\n`)
    }

    super({
      destroy: () => {
        client.off('assert', assertCb)
        client.off('retract', retractCb)
      }
    })

    client.on('assert', assertCb)
    client.on('retract', retractCb)
  }

  _read () {}
}

const log = () => async (context, next) => {
  const requestBody = util.inspect(context.request.body)
  console.log(`<- ${context.url} ${requestBody}`)
  await next()
  const responseBody = util.inspect(context.body)
  console.log(`-> ${context.url} ${responseBody}`)
}

const assert = async context => {
  const { facts } = context.livingroom
  facts.forEach(fact => {
    context.client.assert(fact)
  })
  await context.client.flushChanges()
  context.status = 200
  context.body = { facts }
}

const retract = async context => {
  const { facts } = context.livingroom
  facts.forEach(fact => {
    context.client.retract(fact)
  })
  await context.client.flushChanges()
  context.status = 200
  context.body = { facts }
}

const select = async context => {
  let { facts } = context.livingroom
  await context.client.select(...facts).doAll(assertions => {
    context.body = { assertions }
  })
}

const facts = async context => {
  if (context.accepts('json', 'text/event-stream') == 'text/event-stream') {
    let stream = new DBStream(context.client)
    context.req.on('close,finish,error', () => {
      stream.end()
    })

    context.type = 'text/event-stream'
    context.body = stream
    return
  }
  const assertions = await context.client.getAllFacts()
  context.body = { assertions }
}

const app = new Koa()
app.use(cors())
app.use(body({ multipart: true }))
if (opts.verbose) {
  app.use(log())
}

const parsefacts = () => async (context, next) => {
  let { facts } = context.request.body
  if (!facts) {
    facts =
      context.request.body &&
      context.request.body.fields &&
      context.request.body.fields.facts
  }
  if (!Array.isArray(facts)) {
    facts = [facts]
  }
  /*
  if (!facts) {
    context.body = {
      errors: 'No facts provided',
      facts: []
    }
    context.status = 400
  }
  */
  context.livingroom = { facts }
  await next()
}

app.use(
  route.get('/ping', async context => {
    context.body = 'pong'
  })
)

app.use(parsefacts())
app.use(route.post('/assert', assert))
app.use(route.post('/select', select))
app.use(route.post('/retract', retract))
app.use(route.get('/facts', facts))
app.use(static_('examples'))

module.exports = app
