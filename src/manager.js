const boxen = require('boxen')
const chalk = require('chalk').default
const nbonjour = require('nbonjour').create()

class ServiceManager {
  constructor({services, verbose}={verbose: true}) {
    // seen: Map<url: String, up: bool>
    this.seen = new Map()
    this.drawTimeout = null

    const updateAndDraw = up => (wut, b, c, d) => {
      const {type, protocol, host, port, subtypes, referer} = wut
      const subtype = subtypes.length === 1 ? type : subtypes[subtypes.length - 1]
      this.seen.set(`${subtype} ${type}://${host}:${port}`, up)

      clearTimeout(this.drawTimeout)
      this.drawTimeout = setTimeout(() => this.draw(), 2500)
    }

    this.browsers = services.map(async service => {
      const browser = nbonjour.find(service)
      if (verbose) {
        browser.on('up', updateAndDraw(true))
        browser.on('down', updateAndDraw(false))
      }
      await browser.start()
      return browser
    })
  }

  draw() {
    const { table, getBorderCharacters } = require('table')

    const data = []
    for (const [url, up] of this.seen) {
      const seen = url.split(' ')
      const type = seen.splice(0, 1)
      const colorType = up ? chalk.greenBright(...type) : chalk.red(...type)
      data.push([ colorType, seen ])
    }

    const formatting = {
      borderColor: 'cyanBright',
      padding: 1,
      borderStyle: 'round',
      dimBorder: true
    }

    const config = {
      columns: { 0: { alignment: 'right' } },
      border: getBorderCharacters('void'),
      columnDefault: {
          paddingLeft: 0,
          paddingRight: 1
      },
      drawHorizontalLine: () => {
          return false
      }
    }
    const message = chalk.keyword('hotpink')('living room servers at\n\n') + table(data, config)
    console.log(boxen(message, formatting))
  }

  async close () {
    for (let browser of this.browsers) {
      // how come no browser.stop?
    }
  }
}

const makeService = ({name, type, protocol, subtype, port}) => {
  port = port || parseInt(process.env[`LIVING_ROOM_${type.toUpperCase}_PORT`])
  const hostname = process.env.LIVING_ROOM_NAME || require('os').hostname()
  const host = `${hostname}.local`
  const subtypes = ['livingroom']
  if(subtype) subtypes.push(subtype)
  return {type, protocol, port, name, subtypes, host}
}

module.exports = { ServiceManager, makeService }
