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
  const { fact } = context.request.body
  await context.client.immediatelyAssert(fact)
  context.status = 200
}

const retract = async context => {
  const { fact } = context.request.body
  await context.client.immediatelyRetract(fact)
  context.status = 200
}

const retractEverythingAbout = async context => {
  const { name } = context.request.body
  await context.client.immediatelyRetractEverythingAbout(name)
  context.status = 200
}

const select = async context => {
  const { fact } = context.request.body
  context.body = context.body === undefined ? {} : context.body
  context.body.solutions = []
  await context.client.select(...fact).do(solution => {
    context.body.solutions.push(solution)
  })
}

const facts = async context => {
  const solutions = await context.client.getAllFacts()
  context.body = { solutions }
}

const app = new Koa()
app.use(cors())
app.use(body())
if (opts.verbose) {
  app.use(log())
}
app.use(route.all('/assert', assert))
app.use(route.all('/select', select))
app.use(route.all('/retract', retract))
app.use(route.all('/retractEverythingAbout', retractEverythingAbout))
app.use(route.all('/facts', facts))
app.use(static_('examples'))

module.exports = client => {
  app.context.client = client
  return app
}
