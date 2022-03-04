//==========================================
//=============== Init server ==============
//==========================================
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/bash/:id', function(req , res){
  var bashId = parseInt(req.params.id);

  if (bashId != null &&
      !Number.isNaN(bashId) &&
      activeBashes.has(bashId)) {
    console.log("express bash: join " + bashId);
    res.sendFile(__dirname + '/public/bash.html');
  } else {
    console.log("express bash: invalid raw bash ID");
    res.redirect('/?failed=1');
  }
});

function onConnection(socket){
  console.log("connection started")
  /*
  This field will limit each socket connection
  to only be able to create one bash.
  */
  socket.hasCreatedBash = false;
  registerOnSetNickname(socket);
  registerOnSendMessage(socket);
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
const activeStatusProcessors = new Map();

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
    numUsers: 0,
    users: {}
  };
  var elapsedTimeStopWatch = createStopWatch();
  var bashStatusProcessor = new BashStatusProcessor(bash);

  bash.id = createBashId();
  activeBashes.set(bash.id, bash);
  activeStopWatches.set(bash.id, elapsedTimeStopWatch);
  activeStatusProcessors.set(bash.id, bashStatusProcessor);

  return bash.id;
}

function getBashSecurelyForSocket(socket, requestedBashId, eventName) {
  for (let room of socket.rooms) {
    let socketBashId = parseInt(room);
    if (activeBashes.has(socketBashId) && socketBashId == requestedBashId) {
      return activeBashes.get(socketBashId);
    }
  }
  console.log(eventName + ": bash not found")
  return false;
}

function sanitizeBashId(rawBashId, event) {
  var bashId = parseInt(rawBashId);

  if (bashId == null || Number.isNaN(bashId)) {
    console.log(event + ": invalid raw bash ID");
    return null;
  }

  return bashId;
}

function sanitizeSeekTime(rawSeekTime, event) {
  var seekTime = Number(rawSeekTime);

  if (seekTime == null || Number.isNaN(seekTime)) {
    console.log(event + ": invalid seek time");
    return 0;
  }

  return seekTime;
}

function validateYoutubeUrl(url) {
  var p = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  if(url.match(p)){
      return url.match(p)[1];
  }
  return false;
}

function createRandomNickName(bash) {
  const max = 1000000;  
  var randomNickname = "guest" + Math.floor(Math.random() * max).toString();

  // Make sure randomNickname is unique
  while(bash.users[randomNickname]) {
    randomNickname = "guest" + Math.floor(Math.random() * max).toString();
  }

  return randomNickname;
}

function registerOnSetNickname(socket) {
  socket.on('setNickname', (data) => {

    var rawNickname = data.nickname;
    var nicknameLengthLimit = 20;
    var bashId = sanitizeBashId(data.bashId)
    var bash = getBashSecurelyForSocket(socket, bashId, "setNickname");

    if (!bash) {
      return;
    }

    let bashStatusProcessor = activeStatusProcessors.get(data.bashId);
    var alphaNumericChars = /^[a-z0-9]+$/i;
    var hasErrors = 0;

    if (!rawNickname || typeof(rawNickname) != "string" || !rawNickname.match(alphaNumericChars) || rawNickname.length > nicknameLengthLimit) {
      hasErrors = 1;
      console.log("Invalid username");
    }
    else if (bash.users[rawNickname]) {
      hasErrors = 2;
      console.log("Username already exists")
    }
    else {
      // removing default nickname before assigning user created nickname
      bash.users[socket.data.nickname] = false;
      socket.data.nickname = rawNickname;
      bash.users[rawNickname] = true;
      hasErrors = 0;
      console.log(rawNickname + " joined bash")
      bashStatusProcessor.process(socket, BashStatusEvents.join);
    }
    socket.emit("setNicknameResponse", hasErrors);
  })
}

function registerOnSendMessage(socket) {
  socket.on('sendMessage', (data) => {
    let bashId = sanitizeBashId(data.bashId);
    let bash = getBashSecurelyForSocket(socket, bashId, "sendMessage");
    if (!bash) {
      return;
    }
    let message = data.message;
    var messageLengthLimit = 125;

    if (!message || typeof(message) != "string" || message.length > messageLengthLimit) {
      console.log("Invalid message");
      return;
    }

    let user = socket.data.nickname;
    socket.to(bash.id.toString()).emit("messageReceived", {message:message, user:user})
  })
}

function registerOnDisconnecting(socket) {
  socket.on("disconnecting", function () {
    var rooms = socket.rooms;
    console.log( 'disconnecting: ', rooms);
    for (let room of rooms) {
      let bashId = parseInt(room);
      if (activeBashes.has(bashId)) {
        let bash = activeBashes.get(bashId);
        let statusProcessor = activeStatusProcessors.get(bashId);
        bash.users[socket.data.nickname] = false;
        statusProcessor.process(socket, BashStatusEvents.leave);

        if (io.sockets.adapter.rooms.get(room).size == 1) {
          activeBashes.delete(bashId);
          activeStopWatches.delete(bashId);
        }
      }
    }
  });
}

function registerOnCreateBash(socket) {
  socket.on('createBash', () => {
    if (socket.hasCreatedBash) {
      console.log("createBash: someone is attempting to create another bash!");
      return;
    }

    socket.hasCreatedBash = true;

    var bashId = createBash();
    console.log("createBash received");
    socket.emit('bashCreated', bashId)
  });
}

function registerOnJoinBash(socket){
  socket.on('joinBash', (rawBashId) => {
    console.log("join bash received");
    var bashId = sanitizeBashId(rawBashId, 'joinBash');
    var bash = activeBashes.get(bashId);
    if (!bash) {
      return;
    }

    var stopwatch = activeStopWatches.get(bashId);
    var nickname = createRandomNickName(bash);
    socket.data.nickname = nickname;
    bash.users[nickname] = true;

    socket.join(bashId.toString());
    if (bash.isPlaying) {
      bash.seekTime += stopwatch.currentTime();
      stopwatch.reset();
      stopwatch.start();
    }
    socket.emit('bashJoined', bash, nickname);
  });
}

function registerOnSetUrl(socket){
  socket.on('setUrl', (data) => {
    if (!validateYoutubeUrl(data.url)) {
      console.log("setUrl: invalid youtube URL");
      socket.emit('setUrlError');
      return;
    }

    var bashId = sanitizeBashId(data.bashId, 'setUrl');
    var bash = getBashSecurelyForSocket(socket, bashId, 'setUrl');
    if (!bash) {
      socket.emit('setUrlError');
      return;
    }

    var stopwatch = activeStopWatches.get(data.bashId);
    var statusProcessor = activeStatusProcessors.get(bashId);
    var youtubeId = data.url.split("=")[1];

    console.log("setUrl received");
    bash.youtubeId = youtubeId;
    bash.seekTime = 0;
    stopwatch.reset();
    io.to(bash.id.toString()).emit("videoUpdated", youtubeId);
    statusProcessor.process(socket, BashStatusEvents.setUrl);
  });
}

function registerOnVideoPlaying(socket){
  socket.on('playVideo', (data) => {
    var bashId = sanitizeBashId(data.bashId, 'playVideo');
    var bash = getBashSecurelyForSocket(socket, bashId, 'playVideo');
    if (!bash) {
      return;
    }

    var stopwatch = activeStopWatches.get(bashId);
    var statusProcessor = activeStatusProcessors.get(bashId);
    var seekTime = sanitizeSeekTime(data.seekTime, 'playVideo');

    bash.isPlaying = true;
    bash.seekTime = seekTime;
    stopwatch.start();
    socket.to(bash.id.toString()).emit("videoPlaying", bash);
    statusProcessor.process(socket, BashStatusEvents.play);
  });
}

function registerOnVideoSeeked(socket){
  socket.on('seekVideo', (data) => {
    console.log("seek video received");
    var bashId = sanitizeBashId(data.bashId, 'seekVideo');
    var bash = getBashSecurelyForSocket(socket, bashId,'seekVideo');
    if (!bash) {
      return;
    }

    var stopwatch = activeStopWatches.get(bashId);
    var statusProcessor = activeStatusProcessors.get(bashId);
    var seekTime = sanitizeSeekTime(data.seekTime, 'seekVideo');

    bash.seekTime = seekTime;
    if (bash.isPlaying) {
      stopwatch.reset();
      stopwatch.start();
    }
    socket.to(bash.id.toString()).emit("videoSeek", bash);
    statusProcessor.process(socket, BashStatusEvents.seek);
  });
}

function registerOnVideoPaused(socket){
  socket.on('pauseVideo', (rawBashId) => {
    var bashId = sanitizeBashId(rawBashId, 'pauseVideo');
    var bash = getBashSecurelyForSocket(socket, bashId, 'pauseVideo');
    if (!bash) {
      return;
    }

    var stopwatch = activeStopWatches.get(bashId);
    var statusProcessor = activeStatusProcessors.get(bashId);

    bash.isPlaying = false;
    bash.seekTime += stopwatch.currentTime();
    stopwatch.reset();
    socket.to(bash.id.toString()).emit("videoPaused", bash);
    statusProcessor.process(socket, BashStatusEvents.pause);
  });
}

function registerOnSyncRequest(socket){
  socket.on('syncRequest', (rawBashId) => {
    var bashId = sanitizeBashId(rawBashId, 'syncRequest');
    var bash = getBashSecurelyForSocket(socket, bashId, 'syncRequest');
    if (!bash) {
      return;
    }

    var stopwatch = activeStopWatches.get(bashId);

    bash.seekTime += stopwatch.currentTime();
    stopwatch.reset();
    stopwatch.start();
    socket.emit("videoSeek", bash);
  });
}

const BashStatusEvents = {
  play: "play",
  pause: "pause",
  seek: "seek",
  join: "join",
  leave: "leave",
  setUrl: "setUrl",
}

/* BashStatusProcessor handles notifying the users when bash 
status changes, such as when user pauses or seeks the video.
*/
function BashStatusProcessor(bash) {
  let currentSeekTime = bash.seekTime;

  /* Call this after bash has been updated */
  this.process = function(userSocket, userEvent) {
    const statusUpdateEvent = "statusUpdate";
    let statusData = {
      user: userSocket.data.nickname,
      event: userEvent,
      data: {},
    };
    switch(userEvent) {
      case BashStatusEvents.play:
        if (Math.round(currentSeekTime) != Math.round(bash.seekTime)) {
          statusData.event = BashStatusEvents.seek;
        }
      case BashStatusEvents.seek:
        statusData.data.seekTime = bash.seekTime;
      case BashStatusEvents.pause:
      case BashStatusEvents.setUrl:
        currentSeekTime = bash.seekTime; // Should be 0 for setUrl!
      case BashStatusEvents.join:
      case BashStatusEvents.leave:
        io.to(bash.id.toString()).emit(statusUpdateEvent, statusData);
      default:
        break;
    }
  };
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
