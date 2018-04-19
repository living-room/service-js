# service-js

Creates a room database that you can connect to over HTTP, socket.io, and osc!

You can test it out by running `npm start` after installing the dependencies with `npm install`

For motivations, context, and philosophy, check out https://github.com/living-room/living-room

For a nicer javascript client, check out https://github.com/living-room/client-js

## installing

If you have systemd, you can generate and install a service file with `npm run systemd`

We also have a git [post-receive hook](./hooks/post-receive) which we setup like so:

    # on remote machine
    git clone --bare https://github.com/living-room/service-js.git service-js.git
    mkdir room-server
    # on local machine
    git remote add my-remote-machine ssh://my-remote-machine/home/room/room-server.git

After deploying the default branch, the post-receive hook checks it out and restarts the system service. neat.

## example http

    $ curl -d 'facts=curl is an app at (20, 30)' localhost:3000/assert
    OK

    $ curl -d 'facts=$who is an app at ($x, $y)' localhost:3000/select
    {"assertions":[{"who":{"word":"curl"},"x":{"value":20},"y":{"value":30}}]}%

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

## example opensoundcontrol

from [examples/osc.pde](examples/osc.pde)

```processing
/**
 * based off of oscP5message by andreas schlegel
 * oscP5 website at http://www.sojamo.de/oscP5
 */

import oscP5.*;
import netP5.*;

OscP5 oscP5;
NetAddress myRemoteLocation;

void setup() {
  size(400,400);
  frameRate(25);
  oscP5 = new OscP5(this, 12000);

  myRemoteLocation = new NetAddress("127.0.0.1",41234);
}


void draw() {
  background(0);
}

void mousePressed() {
  OscMessage assertMessage = new OscMessage("/assert");
  assertMessage.add("processing is a program at (0.2, 0.3)");
  oscP5.send(assertMessage, myRemoteLocation);

  OscMessage assert2Message = new OscMessage("/assert");
  assert2Message.add("coolprocessing is a notherprogram at (0.4, 0.4)");
  oscP5.send(assert2Message, myRemoteLocation);

  OscMessage selectMessage = new OscMessage("/select");
  selectMessage.add("$name is a $type at ($x, $y)");
  oscP5.send(selectMessage, myRemoteLocation);
}
```
