const PORT = process.env.PORT || 3000

const RoomDB = require('roomdb')
const room = new RoomDB()

let app = require('./lib/httpServer.js')(room.client('http'))
app = require('./lib/socketServer.js')(app)(room.client('socket'))

let osc = require('./lib/oscServer.js')(room.client('osc'))

app.listen(PORT)
console.log(`http and websocket server listening on :${PORT}`)

osc.open()
console.log(`osc server listening on ${41234}`)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
