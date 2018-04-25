class LivingRoomOscServer {
  constructor (client) {
    this.client = client
    this.connections = new Map()
    this.messageHandlers = {
      '/echo': ({connection, args}) => {
        this.send(connection, '/echo', args)
      },
      '/assert': ({args}) => {
        args.forEach(fact => {
          this.client.assert(fact)
        })
        this.client.flushChanges()
      },
      '/retract': ({args}) => {
        args.forEach(fact => {
          this.client.retract(fact)
        })
        this.client.flushChanges()
      },
      '/select': ({connection, args}) => {
        this.client.select({facts: args})
          .then(({assertions}) => {
            this.send(connection, '/assertions', JSON.stringify(assertions))
          })
      },
      '/subscribe': ({connection, args}) => {
        this.client.subscribe({facts: args})
          .then(() => {
            this.send(connection, '/subscriptions', JSON.stringify(args))
          })
      }
    }
  }

  send (connection, address, string) {
    connection.send({
      address,
      args: [ { type: 's', value: string } ]
    })
  }

  listen (localPort = 41234, localAddress = '0.0.0.0') {
    const { UDPPort } = require('osc')
    const osc = new UDPPort({ localAddress, localPort })

    osc.on(`ready`, () => {
      const mdns = require('mdns')
      this.ad = mdns.createAdvertisement(mdns.udp('osc', 'livingroom'), localPort)
      this.ad.start()
    })

    osc.on('message', ({address, args}, _, {address: remoteAddress}) => {
      const remotePort = args[0]
      const id = `osc://${remoteAddress}:${remotePort}`

      if (!this.connections.has(id)) {
        const connection = new UDPPort({remoteAddress, remotePort})
        this.connections.set(id, connection)
      }

      const connection = this.connections.get(id)
      const handle = this.messageHandlers[address]
      handle({address, args, connection})
    })

    this.osc = osc
    osc.open()
  }
}

module.exports = client => new LivingRoomOscServer(client)
