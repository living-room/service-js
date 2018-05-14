// create(client: Room.Client): Service
module.exports = {
  create: client => {
    const httpServer = require('./httpserver')
    httpServer.context.client = client

    const { makeService } = require('../living-room-services')
    const hostname =  require('os').hostname()
    const service = makeService({name: `${hostname} living room http`, type: 'http'})

    httpServer.listen(service.port, () => {
      const nbonjour = require('nbonjour').create()
      nbonjour.publish(service)
    })

    return service
  }
}
