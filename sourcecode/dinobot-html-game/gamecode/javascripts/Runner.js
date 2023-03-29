function hideClass(name) {
    for (var elem of $(name)) elem.style.display = "none";
}
var DEFAULT_WIDTH = 600, FPS = 60;
var IS_HIDPI = false, IS_IOS = false, IS_MOBILE = false, IS_TOUCH_ENABLED = false;
function Runner(outerContainerId) {
    Runner.instance_ = this;
    var outerContainerEl = document.querySelector(outerContainerId);
    this.outerContainerEl = outerContainerEl
    if (outerContainerEl == null)
        throw Error("outer container id not found")
    this.containerEl = null;
    this.config = Runner.config;
    this.dimensions = Runner.defaultDimensions;
    this.canvas = null;
    this.canvasCtx = null;
    this.tRex = null;
    this.distanceMeter = null;
    this.distanceRan = 0;
    this.highestScore = 0;
    this.time = 0;
    this.runningTime = 0;
    this.msPerFrame = 1000 / FPS;
    this.currentSpeed = Runner.config.SPEED;
    this.obstacles = [];
    this.started = false;
    this.activated = false;
    this.crashed = false;
    this.paused = false;
    this.resizeTimerId_ = null;
    this.playCount = 0;
    this.audioBuffer = null;
    this.soundFx = {};
    this.audioContext = null;
    this.images = {};
    this.imagesLoaded = 0;
    this.isHumanPlayer = true;
    loadImages(this);
};
Runner.config = {
    ACCELERATION: 0.001,
    BG_CLOUD_SPEED: 0.2,
    BOTTOM_PAD: 10,
    CLEAR_TIME: 3000,
    CLOUD_FREQUENCY: 0.5,
    GAMEOVER_CLEAR_TIME: 750,
    GAP_COEFFICIENT: 0.6,
    GRAVITY: 0.6,
    INITIAL_JUMP_VELOCITY: 12,
    MAX_CLOUDS: 6,
    MAX_OBSTACLE_LENGTH: 3,
    MAX_SPEED: 12,
    MIN_JUMP_HEIGHT: 35,
    MOBILE_SPEED_COEFFICIENT: 1.2,
    RESOURCE_TEMPLATE_ID: "audio-resources",
    SPEED: 6,
    SPEED_DROP_COEFFICIENT: 3
};
Runner.defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: 150
};
Runner.classes = {
    CANVAS: "runner-canvas",
    CONTAINER: "runner-container",
    CRASHED: "crashed",
    ICON: "icon-offline",
    TOUCH_CONTROLLER: "controller"
};
Runner.imageSources = {
    LDPI: [
        { name: "CACTUS_LARGE", id: "1x-obstacle-large" },
        { name: "CACTUS_SMALL", id: "1x-obstacle-small" },
        { name: "CLOUD", id: "1x-cloud" },
        { name: "HORIZON", id: "1x-horizon" },
        { name: "RESTART", id: "1x-restart" },
        { name: "TEXT_SPRITE", id: "1x-text" },
        { name: "TREX", id: "1x-trex" }
    ]
};
Runner.sounds = {
    BUTTON_PRESS: "offline-sound-press",
    HIT: "offline-sound-hit",
    SCORE: "offline-sound-reached"
};
Runner.keycodes = {
    JUMP: { "38": 1, "32": 1 }, // Up, spacebar
    DUCK: { "40": 1 }, // Down
    RESTART: { "13": 1 } // Enter
};
Runner.events = {
    ANIM_END: "webkitAnimationEnd",
    CLICK: "click",
    KEYDOWN: "keydown",
    KEYUP: "keyup",
    MOUSEDOWN: "mousedown",
    MOUSEUP: "mouseup",
    RESIZE: "resize",
    TOUCHEND: "touchend",
    TOUCHSTART: "touchstart",
    VISIBILITY: "visibilitychange",
    BLUR: "blur",
    FOCUS: "focus",
    LOAD: "load"
};
function loadImages(runner) {
    var imageSources = Runner.imageSources.LDPI;
    var numImages = imageSources.length;
    for (var i = numImages - 1; i >= 0; i--) {
        var imgSource = imageSources[i];
        runner.images[imgSource.name] = document.getElementById(
            imgSource.id
        );
    }
    init(runner);
}