'use strict';

(function() {

  var testCounter = 0;
  var socket = io();
  var testButton = document.getElementById('test-button');
  var testText = document.getElementById('test-text');

  testButton.addEventListener('click', onTestToServer);

  socket.on('testToClient', onTestToClient);

  function onTestToServer(){
    console.log("testButton click")
    socket.emit('testToServer', testCounter);
  }

  function onTestToClient(data){
    console.log("testToClient received")
    testCounter = data;
    testText.innerHTML = "Server test counter: " + testCounter;
  }
})();