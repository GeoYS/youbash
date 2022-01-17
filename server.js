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
  var bashId = parseInt(req.params.id);
  console.log("express join bash: " + bashId);
  if (activeBashes.has(bashId)) {
    res.sendFile(__dirname + '/public/bash.html');
  } else {
    res.redirect('/?failed=1');
  }
});

function onConnection(socket){

  console.log("connection started")
  registerOnDisconnecting(socket);
  registerOnCreateBash(socket);
  registerOnJoinBash(socket);
  registerOnSetUrl(socket);
  registerOnVideoPlaying(socket);
  registerOnVideoSeeked(socket);
  registerOnVideoPaused(socket);
  registerOnSyncRequest(socket);
}

io.on('connection', onConnection);

server.listen(port, () => console.log(`app listening at http://localhost:${port}`));

//==========================================
//============ Youbash Main code ===========
//==========================================

// Table of bashes 
// Key is unique identifier for Bash
// Value is the Bash object
const activeBashes = new Map();
const activeStopWatches = new Map();

function createBashId() {
  const max = 1000000;  
  var bashId = Math.floor(Math.random() * max);

  // Make sure ID is unique
  while(activeBashes.has(bashId)) {
    bashId = Math.floor(Math.random() * max);
  }

  return bashId;
}

function createBash() {
  var bash = {
    id: "",
    youtubeId: "",
    isPlaying: false, 
    seekTime: 0,
    numUsers: 0
  };
  var elapsedTimeStopWatch = createStopWatch();

  bash.id = createBashId();
  activeBashes.set(bash.id, bash);
  activeStopWatches.set(bash.id, elapsedTimeStopWatch);

  return bash.id;
}

function registerOnDisconnecting(socket) {
  socket.on("disconnecting", function () {
    var rooms = socket.rooms;
    console.log( 'disconnecting: ', rooms);
    for (let room of rooms) {
      let bashId = parseInt(room);
      if (io.sockets.adapter.rooms.get(room).size == 1 && 
          activeBashes.has(bashId)) {
        activeBashes.delete(bashId);
        activeStopWatches.delete(bashId);
      }
    }
  });
}

function registerOnCreateBash(socket) {
  socket.on('createBash', () => {
    var bashId = createBash();
    console.log("createBash received");
    socket.emit('bashCreated', bashId)
  });
}

function registerOnJoinBash(socket){
  socket.on('joinBash', (bashId) => {
    var bash = activeBashes.get(bashId);
    var stopwatch = activeStopWatches.get(bashId);
    console.log("join bash received");

    if (!bash) {
      console.log("join bash error");
      return;
    }

    socket.join(bashId.toString());

    bash.seekTime += stopwatch.currentTime();
    stopwatch.reset();
    stopwatch.start();
    socket.emit('bashJoined', bash);
  });
}

function registerOnSetUrl(socket){
  socket.on('setUrl', (data) => {
    var bash = activeBashes.get(data.bashId);
    var stopwatch = activeStopWatches.get(data.bashId);
    console.log("setUrl received");
    if (!bash) {
      console.log("setUrl error");
      return;
    }

    var youtubeId = data.url.split("=")[1];
    bash.youtubeId = youtubeId;
    stopwatch.reset();
    io.to(bash.id.toString()).emit("videoUpdated", youtubeId);
  });
}

function registerOnVideoPlaying(socket){
  socket.on('playVideo', (data) => {
    var bash = activeBashes.get(data.bashId);
    var stopwatch = activeStopWatches.get(data.bashId);
    bash.isPlaying = true;
    bash.seekTime = data.seekTime;
    stopwatch.start();
    socket.to(bash.id.toString()).emit("videoPlaying", bash);
  });
}

function registerOnVideoSeeked(socket){
  socket.on('seekVideo', (data) => {
    console.log("seek video received");
    var bash = activeBashes.get(data.bashId);
    var stopwatch = activeStopWatches.get(data.bashId);
    bash.seekTime = data.seekTime;
    if (bash.isPlaying) {
      stopwatch.reset();
      stopwatch.start();
    }
    socket.to(bash.id.toString()).emit("videoSeek", bash);
  });
}

function registerOnVideoPaused(socket){
  socket.on('pauseVideo', (bashId) => {
    var bash = activeBashes.get(bashId);
    var stopwatch = activeStopWatches.get(bashId);
    bash.isPlaying = false;
    bash.seekTime += stopwatch.currentTime();
    stopwatch.reset();
    socket.to(bash.id.toString()).emit("videoPaused", bash);
  });
}

function registerOnSyncRequest(socket){
  socket.on('syncRequest', (bashId) => {
    var bash = activeBashes.get(bashId);
    var stopwatch = activeStopWatches.get(bashId);
    bash.seekTime += stopwatch.currentTime();
    stopwatch.reset();
    stopwatch.start();
    socket.emit("videoSeek", bash);
  });
}

function createStopWatch() {
  var stopWatch = {};
  var elapsedTime = 0;
  var lastSystemTime = 0;

  stopWatch.reset = () => {
    elapsedTime = 0;
    lastSystemTime = 0;
  }

  stopWatch.start = () => {
    // If stopwatch is still running, do no nothing
    if (lastSystemTime) {
      return;
    }

    lastSystemTime = Date.now();
  }

  stopWatch.pause = () => {
    // If stopwatch is not running, do nothing
    if (!lastSystemTime) {
      return;
    }

    var curSystemTime = Date.now();
    elapsedTime += curSystemTime - lastSystemTime;
    lastSystemTime = 0;
  }

  stopWatch.currentTime = () => {
    // If stopwatch is still running, pause then start to update the elapsed time
    if (lastSystemTime) {
      stopWatch.pause();
      stopWatch.start();
    }
    return elapsedTime / 1000; // Return seconds
  }

  return stopWatch;
}
