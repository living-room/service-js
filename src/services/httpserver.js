const util = require('util')

const Koa = require('koa')
const body = require('koa-body')
const cors = require('@koa/cors')
const route = require('koa-route')
const static_ = require('koa-static')

const minimist = require('minimist')
const opts = minimist(process.argv.slice(2))

const log = () => async (context, next) => {
  const requestBody = util.inspect(context.request.body)
  console.log(`<- ${context.url} ${requestBody}`)
  await next()
  const responseBody = util.inspect(context.body)
  console.log(`-> ${context.url} ${responseBody}`)
}

const assert = async context => {
  let { facts } = context.request.body
  if (!Array.isArray(facts)) {
    facts = [facts]
  }
  facts.forEach(fact => {
    context.client.assert(fact)
  })
  await context.client.flushChanges()
  context.status = 200
  context.body = { facts }
}

const retract = async context => {
  let { facts } = context.request.body
  if (!Array.isArray(facts)) {
    facts = [facts]
  }
  facts.forEach(fact => {
    context.client.retract(fact)
  })
  await context.client.flushChanges()
  context.status = 200
  context.body = { facts }
}

const select = async context => {
  let { facts } = context.request.body
  if (typeof facts === 'string') facts = [facts]
  await context.client.select(...facts).doAll(assertions => {
    context.body = { assertions }
  })
}

const facts = async context => {
  const assertions = await context.client.getAllFacts()
  context.body = { assertions }
}

const app = new Koa()
app.use(cors())
app.use(body())
if (opts.verbose) {
  app.use(log())
}

app.use(
  route.get('/ping', async context => {
    context.body = 'pong'
  })
)
app.use(route.post('/assert', assert))
app.use(route.post('/select', select))
app.use(route.post('/retract', retract))
app.use(route.get('/facts', facts))
app.use(static_('examples'))

module.exports = app
