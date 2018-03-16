const chalk = require('chalk')
const boxen = require('boxen')
const ip = require('ip')
const PORT = process.env.PORT || 3000

const Database = require('living-room-database')
const room = new Database()

let app = require('./lib/httpServer.js')(room.client('http'))
app = require('./lib/socketServer.js')(app)(room.client('socket'))

let osc = require('./lib/oscServer.js')(room.client('osc'))

app.listen(PORT)

osc.open()

const printInfo = () => {
  let message = chalk.green('Serving a living room!')
  message += '\n\n'

  const localURL = `http://localhost:${PORT}`
  message += `- ${chalk.bold('HTTP Local:           ')} ${localURL}`
  try {
    const ipAddress = ip.address()
    const url = `http://${ipAddress}:${PORT}`
    message += `\n- ${chalk.bold('HTTP On Your Network: ')} ${url}`
  } catch (err) {}
  const oscPORT = 41234
  const oscURL = ` osc://localhost:${oscPORT}`
  message += `\n- ${chalk.bold('OSC Local:           ')} ${oscURL}`

  try {
    const ipAddress = ip.address()
    const url = ` osc://${ipAddress}:${oscPORT}`
    message += `\n- ${chalk.bold('OSC On Your Network: ')} ${url}`
  } catch (err) {}

  console.log(
    boxen(message, {
      padding: 1,
      borderColor: 'green',
      margin: 1
    })
  )
}

printInfo()

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
