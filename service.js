const Database = require('@living-room/database-js')
const room = new Database()
const chalk = require('chalk').default
const boxen = require('boxen')

const app = require('./src/services/httpserver')

const socketService = require('./src/services/socketio').create(
  room.client('socket'),
  { app, verbose: false }
)

const oscService = require('./src/services/osc').create(room.client('osc'))

const { ServiceManager } = require('./src/living-room-services')
const manager = new ServiceManager(...socketService, oscService)

process.on('uncaughtException', error => {
  if (error.errno !== 'EADDRINUSE') return
  const findProcess = require('find-process')
  findProcess('port', error.port).then(list => {
    const message =
      chalk.keyword('hotpink')(
        `Another server is listening on port ${
          error.port
        },\nplease stop it with `
      ) + chalk.red(`kill ${list[0].pid}`)
    const formatting = {
      padding: 1,
      float: 'center'
    }
    console.error(boxen(message, formatting))
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
