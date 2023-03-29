let runnerObj;

window.onload = function () {
    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
        runnerObj = new Runner('.main-container');
        loadObstaclesForChoice(runnerObj);

        connectWebsocket(runnerObj);
        document.getElementById("main-frame-notchrome").style.display = "none";
    } else {
        document.getElementById("main-frame-notchrome").style.display = "block";
    }
};

function onPlayerTypeChange(myRadio) {
    currentValue = myRadio.value;
    runnerObj.isHumanPlayer = currentValue == "humanplayer"
    console.log("Plyaer:" + currentValue)
}