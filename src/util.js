module.exports = {
    makeService: (type, protocol) => {
        const defaults = {
            http: '3000',
            socketio: '3000',
            osc: '41234'
        }

        const port = parseInt(process.env[`LIVING_ROOM_${type.toUpperCase}_PORT`] || defaults[type])
        const name = process.env.LIVING_ROOM_NAME || require('os').hostname()
        const subtypes = ['livingroom']
        return {type, protocol, port, name, subtypes}
    }
}