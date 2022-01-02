'use strict';

(function() {

  var socket = io();
  var createBashButton = document.getElementById('create-button');

  createBashButton.addEventListener('click', onCreateBashClick);

  socket.on('bashCreated', onBashCreated);

  function onCreateBashClick(){
    console.log("Create Bash clicked");
    socket.emit('createBash');
  }

  function onBashCreated(bashId){
    console.log("bashCreated received");
    window.location.href = "/bash/" + bashId.toString();
  }
})();