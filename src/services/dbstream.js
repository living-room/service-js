const { Readable } = require('stream')

module.exports = class DBStream extends Readable {
  constructor (client) {
    let assertCb = fact => {
      this.push(`event:assert\ndata:${fact}\n\n`)
    }
    let retractCb = fact => {
      this.push(`event:retract\ndata:${fact}\n\n`)
    }

    super({
      destroy: () => {
        client.off('assert', assertCb)
        client.off('retract', retractCb)
      }
    })

    client.on('assert', assertCb)
    client.on('retract', retractCb)
  }

  _read () {}
}