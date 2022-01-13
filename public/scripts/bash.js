'use strict';

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
    height: '390',
    width: '640',
    videoId: '',
    playerVars: {
      'playsinline': 1
    },
    events: {
      'onReady': onPlayerReady
    }
  });
}

function onPlayerReady() {

  // Higher priority flags are listed first
  var playerFlags = {
    syncOnNextPlay: false, // should set to true before first video play event
    ignoreNextPlayingEvent: false, // should set to true before any seekTo
  };

  // add event listeners to player
  player.addEventListener('onStateChange', onPlayerStateChange);

  function onPlayerStateChange(event) {
    console.log("event data: " + event.data);
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
            console.log("sync on next play");
            socket.emit("syncRequest", bashId);
            return;
          }
        }
        if (playerFlags.ignoreNextPlayingEvent) {
          playerFlags.ignoreNextPlayingEvent = false;
          console.log("ignore playing event");
          return;
        }

        /*
        Handle normal logic.
        */
        if (!localBash.isPlaying) {
          console.log("emit play video");
          localBash.isPlaying = true;
          socket.emit('playVideo', {'bashId': bashId, 'seekTime': player.getCurrentTime()});
        } else {
          console.log("emit seek video");
          socket.emit('seekVideo', {'bashId': bashId, 'seekTime': player.getCurrentTime()});
        }
        break;
      case YT.PlayerState.PAUSED:
        if (localBash.isPlaying)
          localBash.isPlaying = false;
          socket.emit('pauseVideo', bashId);
        break;
      default:
        break;
    }
  }

  //==========================================
  //================ Bash Code ===============
  //==========================================
  var socket = io();
  var urlPath = window.location.pathname.split('/');
  var bashId = parseInt(urlPath[2]);
  var localBash = {
    id: "",
    youtubeId: "",
    isPlaying: false, 
    seekTime: 0,
    numUsers: 0,    
  };
  var submitButtom = document.getElementById('submit-button');
  var urlBar = document.getElementById('url-bar');

  socket.emit("joinBash", bashId);
  socket.on('bashJoined', onBashJoined);
  socket.on('videoUpdated', onVideoUpdated);
  socket.on('videoPlaying', onVideoPlaying);
  socket.on('videoPaused', onVideoPaused);
  socket.on('videoSeek', onVideoSeek);

  submitButtom.addEventListener('click', onSubmitButtonClick);

  function onBashJoined(bash) {
    if (!bash) {
      console.log("Failed to join bash")
      return;
    }
    console.log("Bash " + bash.id + " succesfully joined");
    localBash = bash;
    playerFlags.syncOnNextPlay = true;
    if (localBash.youtubeId && localBash.isPlaying) {
      console.log("video loaded and started");
      player.loadVideoById(localBash.youtubeId, localBash.seekTime);
    } else {
      console.log("video cued");
      player.cueVideoById(localBash.youtubeId, localBash.seekTime);
    }
  }

  function onVideoUpdated(youtubeId) {
    console.log("Url updated " + youtubeId);
    localBash.youtubeId = youtubeId;
    player.cueVideoById(youtubeId);
  }

  function onVideoPlaying(bash) {
    localBash.isPlaying = bash.isPlaying;
    localBash.seekTime = bash.seekTime;
    playerFlags.ignoreNextPlayingEvent = true;
    player.seekTo(bash.seekTime);
    console.log ("video play received");
    player.playVideo();
  }

  function onVideoSeek(bash) {
    localBash.isPlaying = bash.isPlaying;
    console.log("video seek received");
    playerFlags.ignoreNextPlayingEvent = true;
    player.seekTo(bash.seekTime);

    if (!localBash.isPlaying) {
      player.pauseVideo();
    }
  }

  function onVideoPaused(bash) {
    localBash.isPlaying = bash.isPlaying;
    console.log("video paused received");
    player.pauseVideo();
  }

  function onSubmitButtonClick() {
    console.log("submit button clicked");
    var url = urlBar.value;
    socket.emit("setUrl", {
      "bashId": bashId,
      "url": url
    });
  }

}

