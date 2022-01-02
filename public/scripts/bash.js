'use strict';

(function() {
  var socket = io();
  var urlPath = window.location.pathname.split('/');
  var bashId = parseInt(urlPath[2]);
  var localBash = {};
  var youtubeIframe = document.getElementById('youtube-iframe');
  var submitButtom = document.getElementById('submit-button');
  var urlBar = document.getElementById('url-bar');

  socket.emit("joinBash", bashId);
  socket.on('bashJoined', onBashJoined);
  socket.on('videoUpdated', onVideoUpdated);

  submitButtom.addEventListener('click', onSubmitButtonClick);

  function onBashJoined(bash) {
    if (!bash) {
      console.log("Failed to join bash")
      return;
    }
    console.log("Bash " + bash.id + " succesfully joined");
    localBash = bash;
  }

  function onVideoUpdated(youtubeId) {
    console.log("Url updated " + youtubeId);
    localBash.youtubeId = youtubeId;

    var url = "http://www.youtube.com/embed/" + youtubeId;

    youtubeIframe.setAttribute("src", url);
  }

  function onSubmitButtonClick() {
    console.log("submit button clicked");
    var url = urlBar.value;
    socket.emit("setUrl", {
      "bashId": bashId,
      "url": url
    });
  }

})();

