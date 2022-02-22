'use strict';

(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const failed = urlParams.get('failed');
  
  var socket = io();
  var goButtonVisible = false;

  var createBashButton = document.getElementById('create-button');
  var joinBashButton = document.getElementById('join-button');
  var bashInput = document.getElementById('bash-id-input');
  var errorMessage = document.getElementById('error-message');

  // Redirect from failed bash join
  if (failed) {
    errorMessage.style.height = '20px';
  }

  createBashButton.addEventListener('click', onCreateBashClick);
  joinBashButton.addEventListener('click', onJoinBashClick);
  bashInput.addEventListener('keyup', (e) => {
    if (e.key === "Enter") {
      onJoinBashClick();
    }
  });

  socket.on('bashCreated', onBashCreated);

  function onCreateBashClick(){
    socket.emit('createBash');
  }

  function onBashCreated(bashId){
    window.location.href = "/bash/" + bashId.toString();
  }

  function onJoinBashClick() {
    var bashId = parseInt(bashInput.value);
    if (bashId != null && !Number.isNaN(bashId)) {
      window.location.href = "/bash/" + bashId.toString();
    }
    // handling invalid bash ID
    else {
      bashInput.style.border = '2px solid red';
      errorMessage.style.height = '20px';
      setTimeout(() => {
        bashInput.style.border = '';
        errorMessage.style.height = '0px';
      }, 2000);
    }
  }
})();