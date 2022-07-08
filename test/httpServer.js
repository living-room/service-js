import test from 'ava'
import Database from '@living-room/database-js'
import HttpService from '../src/services/http.js'
import request from 'supertest'
import pickPort from 'pick-port'

const gorogInitial = '#gorog is a barbarian at 40, 50'
const gorogMoves = '#gorog is a barbarian at 99, 11'

test.beforeEach(async t => {
  const database = new Database()
  const room = database.client('test-http')
  const port = await pickPort({ type: 'tcp' })
  const httpService = new HttpService({ room, port })
  t.context.app = await httpService.listen()
})

test.afterEach(async t => {
  t.context.app.close()
})

test('assert adds to the log', async t => {
  const { app } = t.context
  await request(app).post('/assert').send({ facts: gorogInitial }).expect(200)
  const facts = await request(app).get('/facts')
  t.deepEqual(facts.body, { assertions: [gorogInitial] })
})

test('retract removes from the log', async t => {
  const { app } = t.context
  await request(app).post('/assert').send({ facts: gorogInitial }).expect(200)
  await request(app).post('/retract').send({ facts: '#gorog is a barbarian at $x, $y' }).expect(200)
  const facts = await request(app).get('/facts')
  t.deepEqual(facts.body, { assertions: [] })
})

test('select grabs the right fact', async t => {
  const { app } = t.context
  await request(app).post('/assert').send({ facts: gorogInitial }).expect(200)
  await request(app).post('/retract').send({ facts: gorogInitial }).expect(200)
  await request(app).post('/assert').send({ facts: gorogMoves }).expect(200)

  const facts = await request(app).get('/facts')
  t.deepEqual(facts.body, { assertions: [gorogMoves] })

  const res = await request(app).post('/select').send({ facts: ['$name is a $what at $x, $y'] })
  const [{ name, what, x, y }] = res.body
  t.is(name.id, 'gorog')
  t.is(what.word, 'barbarian')
  t.is(x.value, 99)
  t.is(y.value, 11)
})
