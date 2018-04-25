module.exports = {
  create: client => {
    const httpServer = require('./httpServer')
    httpServer.context.client = client

    const service = require('./util').makeService('http', 'tcp')

    httpServer.listen(service.port, () => {
      const bonjour = require('nbonjour').create()
      bonjour.publish(service.port)
    })

    return service
  }
}
