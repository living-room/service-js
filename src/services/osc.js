const { makeService } = require('../manager')

module.exports = class OscService {
  constructor ({ port, verbose, room }) {
    this.verbose = verbose
    this.port = port
    this._services = []
    this.connections = new Map()
    this.messageHandlers = {
      '/messages': ({ args }) => {
        args.forEach(message => {
          if (message.assert) room.assert(message.assert)
          if (message.retract) room.retract(message.retract)
        })
        room.flushChanges()
      },
      '/assert': ({ args }) => {
        args.forEach(fact => {
          room.assert(fact)
        })
        room.flushChanges()
      },
      '/retract': ({ args }) => {
        args.forEach(fact => {
          room.retract(fact)
        })
        room.flushChanges()
      },
      '/select': ({ connection, args }) => {
        const facts = args.splice(1)
        connection.options.remotePort = parseInt(args[0])

        room.select(...facts).doAll(assertions => {
          this.send(connection, '/assertions', JSON.stringify(assertions))
        })
      },
      '/subscribe': ({ connection, args }) => {
        room.subscribe({ facts: args }).then(() => {
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
    const port = this.port

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

        if (this.verbose) console.dir(address, args)

        const connection = this.connections.get(id)
        const handle = this.messageHandlers[address] || console.dir
        handle({ address, args, connection })
      }
    )

    this.osc = osc
    osc.open()
  }
}
