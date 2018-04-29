const boxen = require('boxen')
const chalk = require('chalk').default
const stw = require('spread-the-word').default

class ServiceManager {
  constructor(...services) {
    // seen: Map<url: String, up: bool>
    this.seen = new Map()

    const updateAndDraw = up => ({type, protocol, hostname, port, subtypes}) => {
      const subtype = subtypes.length === 1 ? type : subtypes[subtypes.length - 1]
      this.seen.set(`${subtype} ${type}://${hostname}:${port}`, up)
      this.draw()
    }

    stw.on('up', updateAndDraw(true))
    stw.on('down', updateAndDraw(false))

    this.browsers = services.map(async service => await stw.listen(service))
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
      margin: 1
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

const makeService = (type, protocol, subtype) => {
  const defaults = {
      http: '3000',
      socketio: '3000',
      osc: '41234'
  }

  const port = parseInt(process.env[`LIVING_ROOM_${type.toUpperCase}_PORT`] || defaults[type])
  const name = process.env.LIVING_ROOM_NAME || require('os').hostname()
  const subtypes = ['livingroom']
  if(subtype) subtypes.push(subtype)
  return {type, protocol, port, name, subtypes}
}

module.exports = { ServiceManager, makeService }
