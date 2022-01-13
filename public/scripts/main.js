'use strict';

(function() {

  var socket = io();
  var goButtonVisible = false;

  var createBashButton = document.getElementById('create-button');
  var joinBashButton = document.getElementById('join-button');
  var bashInput = document.getElementById('bash-id-input');
  var errorMessage = document.getElementById('error-message');


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
    if (!goButtonVisible) {
      goButtonVisible = true;
      bashInput.classList.add('active');
      joinBashButton.classList.add('go-button');
      joinBashButton.innerHTML = 'GO';
    }
    else {
      var bashId = parseInt(bashInput.value);
      if (bashId != null && !Number.isNaN(bashId)) {
        console.log("Joining valid bash..");
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
    

    
  }
})();