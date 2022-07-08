import boxen from 'boxen'
import chalk from 'chalk'
import nbonjour from 'nbonjour'
import os from 'os'
import { table, getBorderCharacters } from 'table'

const bonjour = nbonjour.create()
// A ServiceManager just shows a box of whats on bonjour from a list of services
class ServiceManager {
  constructor ({ services, verbose } = { verbose: true }) {
    // seen: Map<url: String, up: bool>
    this.seen = new Map()
    this.drawTimeout = null

    const updateAndDraw = up => ({ type, host, port, subtypes }) => {
      const subtype = subtypes.length === 1 ? type : subtypes[subtypes.length - 1]
      this.seen.set(`${subtype} ${type}://${host}:${port}`, up)

      clearTimeout(this.drawTimeout)
      this.drawTimeout = setTimeout(() => this.draw(), 2500)
    }

    this.browsers = services.map(async service => {
      const browser = bonjour.find(service)
      if (verbose) {
        browser.on('up', updateAndDraw(true))
        browser.on('down', updateAndDraw(false))
      }
      await browser.start()
      return browser
    })
  }

  draw () {
    const data = []
    for (const [url, up] of this.seen) {
      const seen = url.split(' ')
      const type = seen.splice(0, 1)
      const colorType = up ? chalk.greenBright(...type) : chalk.red(...type)
      data.push([colorType, seen])
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
    const tablestring = table(data, config).split('\n')
    tablestring.splice(-1)
    const message = chalk.magentaBright('living room servers at\n\n') + tablestring.join('\n')
    console.log(boxen(message, formatting))
  }

  async close () {
    for (const browser of this.browsers) {
      browser.stop()
    }
  }
}

const makeService = ({ name, type, protocol, subtype, port }) => {
  port = port || parseInt(process.env[`LIVING_ROOM_${type.toUpperCase}_PORT`])
  const hostname = process.env.LIVING_ROOM_NAME || os.hostname()
  const host = os.platform === 'linux' ? `${hostname}.local` : hostname
  const subtypes = ['livingroom']
  if (subtype) subtypes.push(subtype)
  return { type, protocol, port, name, subtypes, host }
}

export { ServiceManager, makeService }
