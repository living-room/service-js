const util = require('util')

const Koa = require('koa')
const body = require('koa-body')
const cors = require('@koa/cors')
const route = require('koa-route')
const static_ = require('koa-static')
const DBStream = require('./dbstream')
const { makeService } = require('../manager')

const parsefacts = () => async (context, next) => {
  let { facts } = context.request.body
  if (!facts) {
    facts =
      context.request.body &&
      context.request.body.fields &&
      context.request.body.fields.facts
  }
  if (!Array.isArray(facts)) facts = [facts]
  context.body = { facts }
  await next()
}

const log = () => async (context, next) => {
  const requestBody = util.inspect(context.request.body)
  console.log(`<- ${context.url} ${requestBody}`)
  await next()
  const responseBody = util.inspect(context.body)
  console.log(`-> ${context.url} ${responseBody}`)
}

module.exports = class HttpService {
  constructor(options) {
    this.options = options
    this.room = options.room
    this._services = []
    const app = new Koa()

    app.use(cors())
    app.use(body({ multipart: true }))
    if (options.verbose) app.use(log())

    app.use(parsefacts())

    app.use(route.post('/assert', async context => {
      this.assert(context.body.facts)
    }))

    app.use(route.post('/retract', async context => {
      this.retract(context.body.facts)
    }))

    app.use(route.post('/', async context => {
      this.message(context.body.facts)
    }))

    app.use(route.post('/select', async context => {
      await this.select(context.body.facts).doAll(assertions => {
        context.body = assertions
      })
    }))

    app.use(route.get('/facts', async context => {
      if (context.accepts('json', 'text/event-stream') == 'text/event-stream') {
        let stream = new DBStream(this.room)
        context.req.on('close,finish,error', () => {
          stream.end()
        })

        context.type = 'text/event-stream'
        context.body = stream
        return
      }
      const assertions = await this.facts()
      context.body = { assertions }
    }))

    app.use(static_('examples'))
    this.app = app
  }

  async assert(facts) {
    facts.forEach(fact => this.room.assert(fact))
    await this.room.flushChanges()
  }

  async retract(facts) {
    facts.forEach(fact => this.room.retract(fact))
    await this.room.flushChanges()
  }

  async message (facts) {
    facts.forEach(fact => {
      if (fact.assert) return this.room.assert(fact.assert)
      if (fact.retract) return this.room.retract(fact.retract)
    })
    await this.room.flushChanges()
  }

  select (facts) {
    return this.room.select(...facts)
  }

  async facts () {
    return await this.room.getAllFacts()
  }

  broadcast() {
    const { port } = this.options
    const hostname = require('os').hostname()
    const nbonjour = require('nbonjour').create()
    const service = makeService({
      name: `${hostname}-${port}-living-room-http`,
      type: 'http',
      port
    })
    this._services.push(service)
    nbonjour.publish(service)
  }

  listen() {
    this.broadcast()
    return this.app.listen(this.options.port)
  }
}
