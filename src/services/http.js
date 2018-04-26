// create(client: Room.Client): Service
module.exports = {
  create: client => {
    const httpServer = require('./httpserver')
    httpServer.context.client = client

    const { makeService } = require('../living-room-services')
    const service = makeService('http', 'tcp')

    httpServer.listen(service.port, () => {
      const bonjour = require('nbonjour').create()
      bonjour.publish(service)
    })

    return service
  }
}
