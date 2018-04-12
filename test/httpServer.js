const test = require('ava')
const Database = require('living-room-database')
const request = require('supertest')
const httpServer = require('../lib/httpServer.js')

const gorogInitial = `#gorog is a barbarian at 40, 50`
const gorogMoves = `#gorog is a barbarian at 99, 11`

const createApp = () => httpServer((new Database().client('http'))).listen()

test('assert adds to the log', async t => {
  const app = createApp()
  await request(app).post('/assert').send({ facts: gorogInitial }).expect(200)
  const facts = await request(app).post('/facts')
  t.deepEqual(facts.body, {assertions: [ gorogInitial ]})
})

test('retract removes from the log', async t => {
  const app = createApp()
  await request(app).post('/assert').send({ facts: gorogInitial }).expect(200)
  await request(app).post('/retract').send({ facts: '#gorog is a barbarian at $x, $y' }).expect(200)
  const facts = await request(app).post('/facts')
  t.deepEqual(facts.body, {assertions: [ ]})
})

test.todo('retracts and asserts batch correctly')

test('select grabs the right fact', async t => {
  const app = createApp()
  await request(app).post('/assert').send({ facts: gorogInitial }).expect(200)
  await request(app).post('/retract').send({ facts: gorogInitial }).expect(200)
  await request(app).post('/assert').send({ facts: gorogMoves }).expect(200)

  const facts = await request(app).post('/facts')
  t.deepEqual(facts.body, {assertions: [ gorogMoves ]})

  const res = await request(app).post('/select').send({ facts: ['$name is a $what at $x, $y'] })
  const [{name, what, x, y}] = res.body.assertions
  t.is(name.id, 'gorog')
  t.is(what.word, 'barbarian')
  t.is(x.value, 99)
  t.is(y.value, 11)
})
