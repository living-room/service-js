const { makeService } = require('../manager')

module.exports = class OscService {
  constructor (options) {
    this.options = options
    this.room = options.room
    this._services = []
    this.connections = new Map()
    this.messageHandlers = {
      '/echo': ({ connection, args }) => {
        this.send(connection, '/echo', args)
      },
      '/assert': ({ args }) => {
        args.forEach(fact => {
          this.room.assert(fact)
        })
        this.room.flushChanges()
      },
      '/retract': ({ args }) => {
        args.forEach(fact => {
          this.room.retract(fact)
        })
        this.room.flushChanges()
      },
      '/select': ({ connection, args }) => {
        const facts = args.splice(1)
        connection.options.remotePort = parseInt(args[0])

        this.room.select(...facts).doAll(assertions => {
          this.send(connection, '/assertions', JSON.stringify(assertions))
        })
      },
      '/subscribe': ({ connection, args }) => {
        this.room.subscribe({ facts: args }).then(() => {
          this.send(connection, '/subscriptions', JSON.stringify(args))
        })
      }
    }
  }

  send (connection, address, factString) {
    connection.open()
    connection.send({
      address,
      args: [{ type: 's', value: factString }]
    })
  }

  listen () {
    const { UDPPort } = require('osc')
    const { port } = this.options

    const osc = new UDPPort({
      localAddress: '0.0.0.0',
      localPort: port
    })

    const hostname = require('os').hostname()
    const nbonjour = require('nbonjour').create()
    const service = makeService({
      name: `${hostname}-${port}-living-room-osc`,
      type: 'osc',
      protocol: 'udp',
      port
    })
    this._services = [service]

    osc.on(`ready`, () => {
      nbonjour.publish(this._services[0])
    })

    osc.on(
      'message',
      ({ address, args }, _, { address: remoteAddress, port: remotePort }) => {
        const id = `osc://${remoteAddress}:${remotePort}`

        if (!this.connections.has(id)) {
          const connection = new UDPPort({ remoteAddress, remotePort })
          this.connections.set(id, connection)
        }

        const connection = this.connections.get(id)
        const handle = this.messageHandlers[address]
        handle({ address, args, connection })
      }
    )

    this.osc = osc
    osc.open()
  }
}
