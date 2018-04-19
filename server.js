const chalk = require('chalk')
const boxen = require('boxen')
const ip = require('ip')
const PORT = process.env.PORT || 3000

const Database = require('@living-room/database-js')
const room = new Database()

let app = require('./lib/httpServer.js')(room.client('http'))
app = require('./lib/socketServer.js')(app, { verbose: false })(
  room.client('socket')
)

let osc = require('./lib/oscServer.js')(room.client('osc'))

app.listen(PORT)

osc.open()

let message = `
  ${chalk.green('Serving a living room!')}

${chalk.bold('locally')}
http://localhost:${PORT}
socketio://localhost:${PORT}
osc://localhost:41234
`

try {
  const ipAddress = ip.address()
  message += `
${chalk.bold('on the network')}
http://${ipAddress}:${PORT}
socketio://${ipAddress}:${PORT}
osc://${ipAddress}:41234
`
} catch (err) {}

console.log(
  boxen(message, {
    padding: 1,
    borderColor: 'green',
    margin: 1
  })
)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
