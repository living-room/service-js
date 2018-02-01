const PORT = process.env.PORT || 3000

const RoomDB = require('roomdb')
const room = new RoomDB()

let app = require('./lib/httpServer.js')(room)
    app = require('./lib/socketServer.js')(room, app)

app.listen(PORT)

console.log(`http and websocket server listening on :${PORT}`)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})