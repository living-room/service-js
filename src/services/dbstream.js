import { Readable } from 'stream'
export default class DBStream extends Readable {
  constructor (room) {
    const assertCb = fact => {
      this.push(`event:assert\ndata:${fact}\n\n`)
    }
    const retractCb = fact => {
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
