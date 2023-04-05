let soundClassifier;

function startSpeechRecognition() {
  // load the sound classifier
  soundClassifier = ml5.soundClassifier('SpeechCommands18w', modelReady);
}

function modelReady() {
  console.log('Model is ready!');
  // start listening
  soundClassifier.classify(gotCommand);
}

function gotCommand(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  // console log the results
  console.log(results);
  // check if the user said "up" with confidence above a threshold
  const threshold = 0.8; // set the threshold value
  results.forEach(result => {
    if (result.label === 'up' && result.confidence > threshold) {
      makeJump();
    }
  });
}
