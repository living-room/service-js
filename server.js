const boxen = require('boxen')
const chalk = require('chalk').default
const mdns = require('mdns')
const PORT = parseInt(process.env.PORT || '3000')
const OSC_PORT = parseInt(process.env.OSC_PORT || '41234')

const Database = require('@living-room/database-js')
const room = new Database()

let app = require('./lib/httpServer.js')(room.client('http'))
app = require('./lib/socketServer.js')(app, { verbose: false })(
  room.client('socket')
)

let osc = require('./lib/oscServer.js')(room.client('osc'))

const services = new Map([
  [mdns.tcp('http', 'livingroom').toString(), new Map()],
  [mdns.udp('osc', 'livingroom').toString(), new Map()],
  [mdns.tcp('socketio', 'livingroom').toString(), new Map()]
])

console.dir(services)

const draw = () => {
  let message = ['living room servers at', '']
  for (const [, types] of services) {
    for (const [id, {up}] of types) {
      message.push(up ? chalk.green(id) : chalk.red(id))
    }
  }

  const formatting = {
    borderColor: 'white',
    padding: 1,
    margin: 1
  }
  console.log(boxen(message.join('\n'), formatting))
}

for (let service of services.keys()) {
  const browser = mdns.createBrowser(mdns.makeServiceType(service))

  browser.on('serviceUp', wut => {
    console.dir(wut)
    const {host, port, addresses, type} = wut
    console.log(type.toString())
    const matching = services.get(type.toString())
    console.dir(matching)
    const id = `${type.name}://${host}:${port}`
    matching.set(id, {host, port, addresses, type, up: true})
    draw()
  })

  browser.on('serviceDown', ({type, name, replyDomain}) => {
    const types = services.get(type.toString())
    const id = `${type.name}://${name}.${replyDomain}`
    for (const seen of types.keys()) {
      if (seen.startsWith(id)) {
        types.get(seen).up = false
      }
    }
    draw()
  })
  browser.start()
}

osc.listen(OSC_PORT)
app.listen(PORT)

process.on('SIGINT', () => {
  console.log()
  console.log(`see you later, space surfer...`)
  process.exit(0)
})
