const boxen = require('boxen')
const chalk = require('chalk').default
const nbonjour = require('nbonjour').create()

class ServiceManager {
  constructor(...services) {
    // seen: Map<url: String, up: bool>
    this.seen = new Map()

    const updateAndDraw = up => (wut, b, c, d) => {
      const {type, protocol, host, port, subtypes, referer} = wut
      const subtype = subtypes.length === 1 ? type : subtypes[subtypes.length - 1]
      this.seen.set(`${subtype} ${type}://${host}:${port}`, up)
      this.draw()
    }

    this.browsers = services.map(async service => {
      const browser = nbonjour.find(service)
      browser.on('up', updateAndDraw(true))
      browser.on('down', updateAndDraw(false))
      browser.start()
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
      float: 'center',
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
}

const makeService = ({name, type, protocol, subtype}) => {
  const defaults = {
      http: '3000',
      socketio: '3000',
      osc: '41234'
  }

  const port = parseInt(process.env[`LIVING_ROOM_${type.toUpperCase}_PORT`] || defaults[type])
  const hostname = process.env.LIVING_ROOM_NAME || require('os').hostname()
  const host = `${hostname}.local`
  const subtypes = ['livingroom']
  if(subtype) subtypes.push(subtype)
  return {type, protocol, port, name, subtypes, host}
}

module.exports = { ServiceManager, makeService }
