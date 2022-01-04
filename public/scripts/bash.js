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

  // add event listeners to player
  player.addEventListener('onStateChange', onPlayerStateChange);

  function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
      socket.emit('playVideo', bashId)
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

  submitButtom.addEventListener('click', onSubmitButtonClick);

  function onBashJoined(bash) {
    if (!bash) {
      console.log("Failed to join bash")
      return;
    }
    console.log("Bash " + bash.id + " succesfully joined");
    localBash = bash;
    player.cueVideoById(localBash.youtubeId);
  }

  function onVideoUpdated(youtubeId) {
    console.log("Url updated " + youtubeId);
    localBash.youtubeId = youtubeId;
    player.cueVideoById(youtubeId);
  }

  function onVideoPlaying() {
    localBash.isPlaying = true;
    player.playVideo();
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

