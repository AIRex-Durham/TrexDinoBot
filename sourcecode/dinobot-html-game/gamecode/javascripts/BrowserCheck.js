window.onload = function () {
    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
        runner = new Runner('.main-container');
        loadObstaclesForChoice(runner);
        document.getElementById("main-frame-notchrome").style.display = "none";
    } else {
        document.getElementById("main-frame-notchrome").style.display = "block";
    }
};