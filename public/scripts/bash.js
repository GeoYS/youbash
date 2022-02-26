'use strict';
var socket = io();
var urlPath = window.location.pathname.split('/');
var bashId = parseInt(urlPath[2]);
var nickname = "";

// Helper
function toTimestampString(seconds) {
  var hours   = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds - (hours * 3600)) / 60);
  var seconds = Math.round(seconds - (hours * 3600) - (minutes * 60));

  if (minutes < 10 && hours) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }

  if (hours) {
    return hours + ':' + minutes + ':' + seconds;
  }

  return minutes + ':' + seconds;
}

//=====================================================
//============ YouTube Player Creation Code ===========
//=====================================================

// will be replaced by youtube iframe playter
var player;

// youtube API call
var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
  player = new YT.Player('youtube-iframe', {
    height: '100%',
    width: '100%',
    videoId: '',
    playerVars: {
      'playsinline': 1,
      'mute' : 1
    },
    events: {
      'onReady': onPlayerReady
    }
  });
}

(function() {
  var nicknameButton = document.getElementById('nickname-button');
  var nicknameInput = document.getElementById('nickname-input');
  var nicknameModal = document.getElementById('nickname-modal');
  var nicknameErrorMessage = document.getElementById('nickname-error-message');

  var sendMessage = document.getElementById('send-button');
  var messageInput = document.getElementById('message-input');
  var messageContainer = document.getElementById('message-container');
  var msgErrorMessage = document.getElementById('msg-error-message');

  nicknameButton.addEventListener('click', onSetNickname);
  nicknameInput.addEventListener('keyup', (e) => {
    if (e.key === "Enter") {
      onSetNickname();
    }
  });
  sendMessage.addEventListener('click', onSendMessage);
  messageInput.addEventListener('keyup', (e) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  });

  socket.on('messageReceived', onMessageReceived);

  function onSetNickname() {
    var nicknameLengthLimit = 20;
    var inputtedNickname = nicknameInput.value;

    if (inputtedNickname.length > nicknameLengthLimit) {
      displayInputErrorMessage(nicknameInput, nicknameErrorMessage, "Please shorten your nickname to less than 20 characters")
      return;
    }

    socket.emit('setNickname', {nickname: inputtedNickname, bashId: bashId})

    //hasErrors: 1 - invalid username, 2 - username taken
    socket.on('setNicknameResponse', (hasErrors) => {
      if (!hasErrors) {
        nicknameModal.classList.add("hide-modal");
        nickname = inputtedNickname;
      }
      else if (hasErrors == 1) {
        displayInputErrorMessage(nicknameInput, nicknameErrorMessage, "Please enter a valid nickname! (Alphanumeric characters only!)")
      }
      else if (hasErrors == 2) {
        displayInputErrorMessage(nicknameInput, nicknameErrorMessage, "Nickname is already in use! Please enter a different one")
      }
    })
  }

  function onSendMessage() {
    let message = messageInput.value;
    let messageLengthLimit = 125;

    if (!message) return;

    if (message.length > messageLengthLimit) {
      displayInputErrorMessage(messageInput, msgErrorMessage, "You've passed the 125 char limit")
      return;
    }

    socket.emit('sendMessage', {message: message, bashId: bashId})

    let messageElement = document.createElement('p');
    messageElement.classList.add('message-text');
    
    let nicknameElement = document.createElement('span');
    nicknameElement.classList.add('own-nickname');
    nicknameElement.textContent = nickname;

    messageElement.appendChild(nicknameElement);
    messageElement.append(": " + message);

    messageInput.value = "";
    messageContainer.appendChild(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  function displayInputErrorMessage(inputElement, errorMsgElement, message) {
    inputElement.style.border = '2px solid red';
    errorMsgElement.textContent = message;
    errorMsgElement.style.height = '20px';
    setTimeout(() => {
      inputElement.style.border = '';
      errorMsgElement.style.height = '0px';
    }, 2000);
  }

  function onMessageReceived(data) {
    let messageElement = document.createElement('p');
    
    messageElement.classList.add('message-text');
    messageElement.textContent = data.user + ": " + data.message;

    messageContainer.appendChild(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }
})();

function onPlayerReady() {

  // Higher priority flags are listed first
  var playerFlags = {
    syncOnNextPlay: false, // should set to true before first video play event
    ignoreNextPlayingEvent: false, // should set to true before any seekTo
  };

  // add event listeners to player
  player.addEventListener('onStateChange', onPlayerStateChange);

  function onPlayerStateChange(event) {
    /*
    **Event Sequences on user actions**
    Play: 1
    Pause: 2
    Seek when paused: N/A
    Seek when playing (Mouse): 2 -> 3 -> 1
    Seek when playing (Keyboard): 3 -> 1 -- to be implemented

    When client emits a 'playVideo' it will provide updated seek time to the server
    When server emits a 'videoPlaying' it will provide the updated seek time to all clients
    When clients receive a 'videoPlaying' event, they will seek to updated time
    */
    switch(event.data) {
      case YT.PlayerState.PLAYING:
        /*
        Handle edge case flags with priority.
        For flag priority, check the playerFlags declaration.
        */
        if (playerFlags.syncOnNextPlay) {
          playerFlags.syncOnNextPlay = false;
          playerFlags.ignoreNextPlayingEvent = false;
          if (localBash.isPlaying) {
            /*
            Sometimes, the video will not play
            after loading despite the bash being in
            a playing state. This causes the video
            to be out of sync when the user starts
            video. This will sync the video on next play.
            */
            socket.emit("syncRequest", bashId);
            return;
          }
        }
        if (playerFlags.ignoreNextPlayingEvent) {
          // Skip additional play event after seek (->3->1)
          playerFlags.ignoreNextPlayingEvent = false;
          return;
        }

        /*
        Handle normal logic.
        */
        if (!localBash.isPlaying) {
          localBash.isPlaying = true;
          socket.emit('playVideo', {'bashId': bashId, 'seekTime': player.getCurrentTime()});
        } else {
          socket.emit('seekVideo', {'bashId': bashId, 'seekTime': player.getCurrentTime()});
        }
        break;
      case YT.PlayerState.PAUSED:
        if (localBash.isPlaying) {
          localBash.isPlaying = false;
          socket.emit('pauseVideo', bashId);
        }
        break;
      default:
        break;
    }
  }

  //==========================================
  //================ Bash Code ===============
  //==========================================
  var localBash = {
    id: "",
    youtubeId: "",
    isPlaying: false, 
    seekTime: 0,
    numUsers: 0,
  };
  var submitButtom = document.getElementById('submit-button');
  var urlBar = document.getElementById('url-bar');
  var messageContainer = document.getElementById('message-container');
  
  socket.emit("joinBash", bashId);
  socket.on('bashJoined', onBashJoined);
  socket.on('videoUpdated', onVideoUpdated);
  socket.on('videoPlaying', onVideoPlaying);
  socket.on('videoPaused', onVideoPaused);
  socket.on('videoSeek', onVideoSeek);
  socket.on('statusUpdate', onStatusUpdate);

  submitButtom.addEventListener('click', onSubmitButtonClick);
  urlBar.addEventListener('keyup', (e) => {
    if (e.key === "Enter") {
      onSubmitButtonClick();
    }
  });

  function onBashJoined(bash, defaultNickname) {
    if (!bash) {
      console.log("Critical error occurred.")
      return;
    }
    nickname = defaultNickname;
    localBash = bash;
    playerFlags.syncOnNextPlay = true;
    if (localBash.youtubeId && localBash.isPlaying) {
      player.loadVideoById(localBash.youtubeId, localBash.seekTime);
    } else {
      player.cueVideoById(localBash.youtubeId, localBash.seekTime);
    }
  }

  function onVideoUpdated(youtubeId) {
    localBash.youtubeId = youtubeId;
    player.cueVideoById(youtubeId);
  }

  function onVideoPlaying(bash) {
    localBash.isPlaying = bash.isPlaying;
    localBash.seekTime = bash.seekTime;
    playerFlags.ignoreNextPlayingEvent = true;
    player.seekTo(bash.seekTime);
    player.playVideo();
  }

  function onVideoSeek(bash) {
    localBash.isPlaying = bash.isPlaying;
    playerFlags.ignoreNextPlayingEvent = true;
    player.seekTo(bash.seekTime);

    if (!localBash.isPlaying) {
      player.pauseVideo();
    }
  }

  function onVideoPaused(bash) {
    localBash.isPlaying = bash.isPlaying;
    player.pauseVideo();
  }

  function onStatusUpdate(statusData) {
    let statusMessage = document.createElement("p");
    let statusText = statusData.user;

    statusMessage.classList.add('status-message');
    
    switch(statusData.event) {
      case "join":
        statusText += " joined the bash.";
        break;
      case "leave":
        statusText += " left the bash.";
        break;
      case "play":
        statusText += " played the video.";
        break;
      case "pause":
        statusText += " paused the video.";
        break;
      case "setUrl":
        statusText += " changed the video.";
        break;
      case "seek":
        statusText += " seeked the video to " + toTimestampString(statusData.data.seekTime) + ".";
        break;
      default:
        break;
    }

    const statusTextElement = document.createTextNode(statusText);

    statusMessage.appendChild(statusTextElement);

    messageContainer.appendChild(statusMessage);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  function onSubmitButtonClick() {
    var url = urlBar.value;
    socket.emit("setUrl", {
      "bashId": bashId,
      "url": url
    });
  }

}

