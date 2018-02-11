# room-server

Creates a room database that you can connect to over HTTP and socket.io

You can test it out by running `node server` after installing the dependencies with `yarn` or `npm install`

For motivations, context, and philosophy, check out https://github.com/jedahan/research

For a nicer javascript client, check out https://github.com/jedahan/room-client

## installing

If you have systemd, you can generate and install a service file with `yarn systemd`

We also have a git [post-receive hook](./hooks/post-receive) which we setup like so:

    # on remote machine
    git clone --bare https://github.com/jedahan/room-server.git room-server.git
    mkdir room-server
    # on local machine
    git remote add my-remote-machine ssh://my-remote-machine/home/room/room-server.git

After deploying the default branch, the post-receive hook checks it out and restarts the system service. neat.

## example http

    $ curl -d '{"fact": "#curl is an app at (20, 30)"}' -H "Content-Type: application/json" localhost:3000/assert
    OK

    $ curl -d '{"facts": ["$what is an app at ($x, $y)"]}' -H "Content-Type: application/json" localhost:3000/select
    {"solutions":[{"what":{"id":"curl"},"x":20,"y":30}]}

## example websocket

from [examples/browser.js](examples/browser.js)

```javascript
const socket = io.connect(`http://localhost:3000`)

socket.on('solutions', solutions => {
  solutions.forEach(solution => {
    console.log(`what am i? a ${solution.what.str}`)
  })
})

socket.on('id', ({id}) => {
  console.log(`got id '${id}'`)
})

socket.emit('assert', ['i am a browser'])

setInterval(() => {
  socket.emit('select', ['i am a $what'])
}, 5000)
```
