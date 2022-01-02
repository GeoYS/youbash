'use strict';

(function() {
  var socket = io();
  var urlPath = window.location.pathname.split('/');
  var bashId = urlPath[1];
  socket.emit("joinBash", bashId);

  socket.on('bashJoined', onBashJoined);

  function onBashJoined(bash) {
    if (!bash) {
      console.log("Failed to join bash")
      return;
    }
    console.log("Bash " + bash.id + " succesfully joined");
  }

})();

