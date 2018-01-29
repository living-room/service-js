const RoomDB = require('roomdb')
const room = new RoomDB()
const clients = new Map()

module.exports = {
  client: function (id = room._nextClientId) {
    const _client = clients.get(id) || room.connect(id)
    if (!clients.has(id)) clients.set(id, _client)
    console.log(_client)
    return _client
  }
}
