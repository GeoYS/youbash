//==========================================
//=============== Init server ==============
//==========================================
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/bash/:id', function(req , res){
  res.sendFile(__dirname + '/public/bash.html');
});

function onConnection(socket){
  console.log("connection started")
  socket.on('testToServer', (data) => {
    console.log("testToServer received " + data);
    socket.emit('testToClient', data+1);
  });
  registerOnCreateBash(socket);
  registerOnJoinBash(socket);
}

io.on('connection', onConnection);

server.listen(port, () => console.log(`app listening at http://localhost:${port}`));

//==========================================
//============ Youbash Main code ===========
//==========================================

// Table of bashes 
// Key is unique 5 character identifier
// Value is the Bash object
const activeBashes = new Map();

function createBashId() {
  const max = 1000000;  
  var bashId = Math.floor(Math.random() * max);

  // Make sure ID is unique
  while(activeBashes.has(bashId)) {
    bashId = Math.floor(Math.random() * max);
  }

  return bashId;
}

function registerOnCreateBash(socket) {
  socket.on('createBash', () => {
    var bashId = createBash()
    console.log("createBash received");
    socket.emit('bashCreated', bashId)
  });
}

function registerOnJoinBash(socket){
  socket.on('joinBash', (bashId) => {
    var bash = activeBashes.get(bashId);
    console.log("join bash received");
    socket.emit('bashJoined', bash);
  });
}

function createBash() {
  var bash = {
    id: "",
    youtubeUrl: "",
    isPlaying: false, 
    seekTime: 0,
    numUsers: 0,    
  };

  bash.id = createBashId();
  activeBashes.set(bash.id, bash);

  return bash.id;
}
