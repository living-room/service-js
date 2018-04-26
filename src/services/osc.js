class OscServer {
  constructor (client) {
    this.client = client
    this.connections = new Map()
    this.messageHandlers = {
      '/echo': ({ connection, args }) => {
        this.send(connection, '/echo', args)
      },
      '/assert': ({ args }) => {
        args.forEach(fact => {
          this.client.assert(fact)
        })
        this.client.flushChanges()
      },
      '/retract': ({ args }) => {
        args.forEach(fact => {
          this.client.retract(fact)
        })
        this.client.flushChanges()
      },
      '/select': ({ connection, args }) => {
        this.client.select({ facts: args }).then(({ assertions }) => {
          this.send(connection, '/assertions', JSON.stringify(assertions))
        })
      },
      '/subscribe': ({ connection, args }) => {
        this.client.subscribe({ facts: args }).then(() => {
          this.send(connection, '/subscriptions', JSON.stringify(args))
        })
      }
    }
  }

  send (connection, address, string) {
    connection.send({
      address,
      args: [{ type: 's', value: string }]
    })
  }

  listen (service, localAddress = '0.0.0.0') {
    const { UDPPort } = require('osc')
    const osc = new UDPPort({ localAddress, localPort: service.port })

    osc.on(`ready`, () => {
      const name = process.env.LIVING_ROOM_NAME || require('os').hostname()
      const bonjour = require('nbonjour').create()
      bonjour.publish(service)
    })

    osc.on('message', ({ address, args }, _, { address: remoteAddress }) => {
      const remotePort = args[0]
      const id = `osc://${remoteAddress}:${remotePort}`

      if (!this.connections.has(id)) {
        const connection = new UDPPort({ remoteAddress, remotePort })
        this.connections.set(id, connection)
      }

      const connection = this.connections.get(id)
      const handle = this.messageHandlers[address]
      handle({ address, args, connection })
    })

    this.osc = osc
    osc.open()
  }
}

// create(client: Room.Client): Service
module.exports = {
  create: client => {
    const server = new OscServer(client)
    const { makeService } = require('../living-room-services')
    const service = makeService('osc', 'udp')
    server.listen(service)
    return service
  }
}
