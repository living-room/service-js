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
