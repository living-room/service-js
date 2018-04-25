const boxen = require('boxen')
const chalk = require('chalk').default
const bonjour = require('nbonjour').create()
const name = process.env.LIVING_ROOM_NAME || require('os').hostname()

module.exports = class ServiceManager {
  constructor(name) {
    // seen: Map<url: String, up: bool>
    this.seen = new Map()

    const services = [
      { name, type: 'http', protocol: 'tcp', subtypes: ['livingroom'] },
      { name, type: 'osc', protocol: 'udp', subtypes: ['livingroom'] },
      { name, type: 'socketio', protocol: 'tcp', subtypes: ['livingroom'] }
    ]

    const updateAndDraw = up => ({type, host, port}) => {
      this.seen.set(`${type}://${host}:${port}`, true)
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
