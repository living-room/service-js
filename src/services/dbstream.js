const { Readable } = require('stream')

module.exports = class DBStream extends Readable {
  constructor (room) {
    let assertCb = fact => {
      this.push(`event:assert\ndata:${fact}\n\n`)
    }
    let retractCb = fact => {
      this.push(`event:retract\ndata:${fact}\n\n`)
    }

    super({
      destroy: () => {
        room.off('assert', assertCb)
        room.off('retract', retractCb)
      }
    })

    room.on('assert', assertCb)
    room.on('retract', retractCb)
  }

  _read () {}
}
