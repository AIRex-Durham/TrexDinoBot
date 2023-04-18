let runnerObj;

window.onload = function () {
    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {

        runnerObj = new Runner('.main-container');
        loadObstaclesForChoice(runnerObj);

        connectWebsocket();

        document.getElementById("main-frame-notchrome").style.display = "none";
    } else {
        document.getElementById("main-frame-notchrome").style.display = "block";
    }
};

function onPlayerTypeChange(myRadio) {
    currentValue = myRadio.value;
    if (currentValue == "humanplayer") {
        runnerObj.player = HUMAN
    }
    else if (currentValue == "aiplayer") {
        runnerObj.player = AI
    }
    else if (currentValue == "rlplayer") {
        runnerObj.player = RL
    }
}
