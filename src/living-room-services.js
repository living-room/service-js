const boxen = require('boxen')
const chalk = require('chalk').default
const bonjour = require('nbonjour').create()

class ServiceManager {
  constructor(...services) {
    // seen: Map<url: String, up: bool>
    this.seen = new Map()

    const updateAndDraw = up => ({type, host, port}) => {
      this.seen.set(`${type}://${host}:${port}`, up)
      this.draw()
    }

    this.browsers = services.map(service => {
      const browser = bonjour.find(service)
      browser.on('up', updateAndDraw(true))
      browser.on('down', updateAndDraw(false))
      browser.start()
      return browser
    })
  }

  draw() {
    let message = ['living room servers at', '']

    for (const [url, up] of this.seen) {
      message.push(up ? chalk.green(url) : chalk.red(url))
    }

    const formatting = {
      borderColor: 'white',
      padding: 1,
      margin: 1
    }

    console.log(boxen(message.join('\n'), formatting))
  }
}

const makeService = (type, protocol) => {
  const defaults = {
      http: '3000',
      socketio: '3000',
      osc: '41234'
  }

  const port = parseInt(process.env[`LIVING_ROOM_${type.toUpperCase}_PORT`] || defaults[type])
  const name = process.env.LIVING_ROOM_NAME || require('os').hostname()
  const subtypes = ['livingroom']
  return {type, protocol, port, name, subtypes}
}

module.exports = { ServiceManager, makeService }
