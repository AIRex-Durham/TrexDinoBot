let soundClassifier;
let isListening = false;

function startSpeechRecognition() {
  // load the sound classifier
  soundClassifier = ml5.soundClassifier('SpeechCommands18w', modelReady);
}

function modelReady() {
  console.log('Model is ready!');
  // start listening
  isListening = true;
  soundClassifier.classify(gotCommand);
}

function gotCommand(error, results) {
  if (!isListening) {
    // don't process results if not listening
    return;
  }

  if (error) {
    console.error(error);
    return;
  }
  // check if the user said "up" with confidence above a threshold
  const threshold = 0.7; // set the threshold value
  results.forEach(result => {
    if (result.label === 'up' && result.confidence > threshold) {
      makeJump();
    }
  });
}

function stopSpeechRecognition() {
    //stop listening
    isListening = false;
    soundClassifier?.classify(() => {});
}

function gamePlayStarted() {
    currentValue = document.getElementById("speechrecog").value
    if(currentValue == true) {
        startSpeechRecognition()
    }
}


function onSpeechRecognisationChange(checkbox) {
    currentValue = checkbox.value;
    if(currentValue == "on") {
        startSpeechRecognition()
    } else {
        stopSpeechRecognition()
    }
}
