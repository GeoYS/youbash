'use strict';

(function() {

  var socket = io();

  var createBashButton = document.getElementById('create-button');
  var joinBashButton = document.getElementById('join-button');
  var bashInput = document.getElementById('bash-id-input');

  createBashButton.addEventListener('click', onCreateBashClick);
  joinBashButton.addEventListener('click', onJoinBashClick);

  socket.on('bashCreated', onBashCreated);

  function onCreateBashClick(){
    console.log("Create Bash clicked");
    socket.emit('createBash');
  }

  function onBashCreated(bashId){
    console.log("bashCreated received");
    window.location.href = "/bash/" + bashId.toString();
  }

  function onJoinBashClick() {
    console.log("Join Bash clicked");
    var bashId = parseInt(bashInput.value);
    if (bashId != null && bashId != NaN) {
      window.location.href = "/bash/" + bashId.toString();
    }
    // handle empty bash input
  }
})();