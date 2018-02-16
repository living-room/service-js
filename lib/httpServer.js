const util = require('util')

const Koa = require('koa')
const body = require('koa-body')
const cors = require('@koa/cors')
const route = require('koa-route')
const static_ = require('koa-static')

const opts = require('minimist')(process.argv.slice(2))

const log = () => async (context, next) => {
  const requestBody = util.inspect(context.request.body)
  console.log(`<- ${context.url} ${requestBody}`)
  await next()
  const responseBody = util.inspect(context.body)
  console.log(`-> ${context.url} ${responseBody}`)
}

const assert = async context => {
  const {fact} = context.request.body
  await context.client.immediatelyAssert(fact)
  context.status = 200
}

const retract = async context => {
  const {fact} = context.request.body
  // TODO: reinstate after merging https://github.com/alexwarth/roomdb/pull/3
  // await context.client.immediatelyRetract(fact)
  context.client.retract(fact)
  await context.client.flushChanges()
  // ---
  context.status = 200
}

const retractEverythingAbout = async context => {
  const {name} = context.request.body
  // TODO: reinstate after merging https://github.com/alexwarth/roomdb/pull/3
  // await context.client.immediatelyRetract(fact)
  context.client.retractEverythingAbout(name)
  await context.client.flushChanges()
  // ---
  context.status = 200
}

const select = async context => {
  const {facts} = context.request.body
  context.body = (context.body === undefined) ? {} : context.body
  context.body.solutions = []
  await context.client
    .select(facts)
    .do(solution => {
      context.body.solutions.push(solution)
    })
}

const facts = async context => {
  context.body = await context.client.getAllFacts()
}

const app = new Koa()
app.use(cors())
app.use(body())
if (opts.verbose) {
  app.use(log())
}
app.use(route.post('/assert', assert))
app.use(route.post('/select', select))
app.use(route.post('/retract', retract))
app.use(route.post('/retractEverythingAbout', retractEverythingAbout))
app.use(route.post('/facts', facts))
// we also respond to put requests because why not
app.use(route.put('/assert', assert))
app.use(route.put('/select', select))
app.use(route.put('/retract', retract))
app.use(route.put('/retractEverythingAbout', retractEverythingAbout))
app.use(route.put('/facts', facts))
app.use(static_('examples'))

module.exports = client => {
  app.context.client = client
  return app
}
