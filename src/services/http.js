import util from 'util'

import Koa from 'koa'
import body from 'koa-body'
import cors from '@koa/cors'
import route from 'koa-route'
import static_ from 'koa-static'
import DBStream from './dbstream.js'
import { makeService } from '../manager.js'
import { hostname } from 'os'
import nbonjour from 'nbonjour'

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
  console.log(`[htp] <- ${context.url} ${requestBody}`)
  await next()
  const responseBody = util.inspect(context.body)
  console.log(`[htp] -> ${context.url} ${responseBody}`)
}

export default class HttpService {
  constructor (options) {
    this.options = options
    this.room = options.room
    this._services = []
    const app = new Koa()

    app.use(cors({
      origin: '*'
    }))

    app.use(body({ multipart: true }))
    if (options.verbose) app.use(log())

    app.use(parsefacts())

    app.use(
      route.post('/assert', context => {
        this.assert(context.body.facts)
      })
    )

    app.use(
      route.post('/retract', async context => {
        this.retract(context.body.facts)
      })
    )

    app.use(
      route.post('/messages', async context => {
        this.message(context.body.facts)
      })
    )

    app.use(
      route.post('/select', async context => {
        await this.select(context.body.facts).doAll(assertions => {
          context.body = assertions
        })
      })
    )

    app.use(
      route.get('/facts', async context => {
        if (
          context.accepts('json', 'text/event-stream') === 'text/event-stream'
        ) {
          const stream = new DBStream(this.room)
          context.req.on('close,finish,error', () => {
            stream.end()
          })

          context.type = 'text/event-stream'
          context.body = stream
          return
        }
        const assertions = await this.facts()
        context.body = { assertions }
      })
    )

    app.use(static_('examples'))
    this.app = app
    return this.app
  }

  async assert (facts) {
    facts.forEach(fact => this.room.assert(fact))
    await this.room.flushChanges()
  }

  async retract (facts) {
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
    return this.room.getAllFacts()
  }

  broadcast () {
    const { port } = this.options
    const bonjour = nbonjour.create()
    const service = makeService({
      name: `${hostname()}-${port}-living-room-http`,
      type: 'http',
      port
    })
    this._services.push(service)
    bonjour.publish(service)
  }

  listen () {
    return this.app.listen(this.options.port, this.broadcast)
  }
}
