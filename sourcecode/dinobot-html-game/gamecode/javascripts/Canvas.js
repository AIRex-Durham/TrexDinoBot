function init(runner) {
    runner.adjustDimensions();
    runner.setSpeed();
    runner.containerEl = document.createElement("div");
    runner.containerEl.className = Runner.classes.CONTAINER;
    // Player canvas container.
    runner.canvas = createCanvas(
        runner.containerEl,
        runner.dimensions.WIDTH,
        runner.dimensions.HEIGHT,
        Runner.classes.PLAYER
    );
    runner.canvasCtx = runner.canvas.getContext("2d");
    runner.canvasCtx.fillStyle = "#f4f4f4";
    runner.canvasCtx.fill();
    Runner.updateCanvasScaling(runner.canvas);
    // Horizon contains clouds, obstacles and the ground.
    runner.horizon = new Horizon(
        runner.canvas,
        runner.images,
        runner.dimensions,
        runner.config.GAP_COEFFICIENT
    );
    // Distance meter
    runner.distanceMeter = new DistanceMeter(
        runner.canvas,
        runner.images.TEXT_SPRITE,
        runner.dimensions.WIDTH
    );
    // Draw t-rex
    runner.tRex = new Trex(runner.canvas, runner.images.TREX);
    runner.outerContainerEl.appendChild(runner.containerEl);
    if (IS_MOBILE) {
        this.createTouchController();
    }
    runner.startListening();
    runner.update();
    window.addEventListener(
        Runner.events.RESIZE,
        runner.debounceResize.bind(runner)
    );
}
Runner.prototype = {
    updateConfigSetting: function (setting, value) {
        console.log(setting, value);
        //if (setting in this.config && value != undefined) {
        this.config[setting] = value;
        switch (setting) {
            case "GRAVITY":
            case "MIN_JUMP_HEIGHT":
            case "SPEED_DROP_COEFFICIENT":
                this.tRex.config[setting] = value;
                break;
            case "INITIAL_JUMP_VELOCITY":
                this.tRex.setJumpVelocity(value);
                break;
            case "SPEED":
                this.setSpeed(value);
                break;
        }
        //}
    },
    /*loadImages: function() {
        var imageSources = Runner.imageSources.LDPI;
        var numImages = imageSources.length;
        for (var i = numImages - 1; i >= 0; i--) {
            var imgSource = imageSources[i];
            this.images[imgSource.name] = document.getElementById(
                imgSource.id
            );
        }
        this.init();
    },*/
    loadSounds: function () {
        this.audioContext = new AudioContext();
        var resourceTemplate = document.getElementById(
            this.config.RESOURCE_TEMPLATE_ID
        ).content;
        for (var sound in Runner.sounds) {
            var soundSrc = resourceTemplate.getElementById(
                Runner.sounds[sound]
            ).src;
            soundSrc = soundSrc.substr(soundSrc.indexOf(",") + 1);
            var buffer = decodeBase64ToArrayBuffer(soundSrc);
            // Async, so no guarantee of order in array.
            this.audioContext.decodeAudioData(
                buffer,
                function (index, audioData) {
                    this.soundFx[index] = audioData;
                }.bind(this, sound)
            );
        }
    },
    setSpeed: function (opt_speed) {
        var speed = opt_speed || this.currentSpeed;
        // Reduce the speed on smaller mobile screens.
        if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
            var mobileSpeed =
                speed *
                this.dimensions.WIDTH /
                DEFAULT_WIDTH *
                this.config.MOBILE_SPEED_COEFFICIENT;
            this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
        } else if (opt_speed) {
            this.currentSpeed = opt_speed;
        }
    },
    /*init: function() {
        this.adjustDimensions();
        this.setSpeed();
        this.containerEl = document.createElement("div");
        this.containerEl.className = Runner.classes.CONTAINER;
        // Player canvas container.
        this.canvas = createCanvas(
            this.containerEl,
            this.dimensions.WIDTH,
            this.dimensions.HEIGHT,
            Runner.classes.PLAYER
        );
        this.canvasCtx = this.canvas.getContext("2d");
        this.canvasCtx.fillStyle = "#f7f7f7";
        this.canvasCtx.fill();
        Runner.updateCanvasScaling(this.canvas);
        // Horizon contains clouds, obstacles and the ground.
        this.horizon = new Horizon(
            this.canvas,
            this.images,
            this.dimensions,
            this.config.GAP_COEFFICIENT
        );
        // Distance meter
        this.distanceMeter = new DistanceMeter(
            this.canvas,
            this.images.TEXT_SPRITE,
            this.dimensions.WIDTH
        );
        // Draw t-rex
        this.tRex = new Trex(this.canvas, this.images.TREX);
        this.outerContainerEl.appendChild(this.containerEl);
        if (IS_MOBILE) {
            this.createTouchController();
        }
        this.startListening();
        this.update();
        window.addEventListener(
            Runner.events.RESIZE,
            this.debounceResize.bind(this)
        );
    },*/
    createTouchController: function () {
        this.touchController = document.createElement("div");
        this.touchController.className = Runner.classes.TOUCH_CONTROLLER;
    },
    debounceResize: function () {
        if (!this.resizeTimerId_) {
            this.resizeTimerId_ = setInterval(
                this.adjustDimensions.bind(this),
                250
            );
        }
    },
    adjustDimensions: function () {
        clearInterval(this.resizeTimerId_);
        this.resizeTimerId_ = null;
        var boxStyles = window.getComputedStyle(this.outerContainerEl);
        var padding = Number(
            boxStyles.paddingLeft.substr(
                0,
                boxStyles.paddingLeft.length - 2
            )
        );
        this.dimensions.WIDTH =
            this.outerContainerEl.offsetWidth - padding * 2;
        // Redraw the elements back onto the canvas.
        if (this.canvas) {
            this.canvas.width = this.dimensions.WIDTH;
            this.canvas.height = this.dimensions.HEIGHT;
            Runner.updateCanvasScaling(this.canvas);
            this.distanceMeter.calcXPos(this.dimensions.WIDTH);
            this.clearCanvas();
            this.horizon.update(0, 0, true);
            this.tRex.update(0);
            // Outer container and distance meter.
            if (this.activated || this.crashed) {
                this.containerEl.style.width = this.dimensions.WIDTH + "px";
                this.containerEl.style.height =
                    this.dimensions.HEIGHT + "px";
                this.distanceMeter.update(0, Math.ceil(this.distanceRan));
                this.stop();
            } else {
                this.tRex.draw(0, 0);
            }
            // Game over panel.
            if (this.crashed && this.gameOverPanel) {
                this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
                this.gameOverPanel.draw();
            }
        }
    },
    playIntro: function () {
        if (!this.started && !this.crashed) {
            this.playingIntro = true;
            this.tRex.playingIntro = true;
            // CSS animation definition.
            var keyframes =
                "@-webkit-keyframes intro { " +
                "from { width:" +
                Trex.config.WIDTH +
                "px }" +
                "to { width: " +
                this.dimensions.WIDTH +
                "px }" +
                "}";
            document.styleSheets[0].insertRule(keyframes, 0);
            this.containerEl.addEventListener(
                Runner.events.ANIM_END,
                this.startGame.bind(this)
            );
            this.containerEl.style.webkitAnimation =
                "intro .4s ease-out 1 both";
            this.containerEl.style.width = this.dimensions.WIDTH + "px";
            if (this.touchController) {
                this.outerContainerEl.appendChild(this.touchController);
            }
            this.activated = true;
            this.started = true;
        } else if (this.crashed) {
            this.restart();
        }
    },
    startGame: function () {
        this.runningTime = 0;
        this.playingIntro = false;
        this.tRex.playingIntro = false;
        this.containerEl.style.webkitAnimation = "";
        this.playCount++;
        // Handle tabbing off the page. Pause the current game.
        window.addEventListener(
            Runner.events.VISIBILITY,
            this.onVisibilityChange.bind(this)
        );
        window.addEventListener(
            Runner.events.BLUR,
            this.onVisibilityChange.bind(this)
        );
        window.addEventListener(
            Runner.events.FOCUS,
            this.onVisibilityChange.bind(this)
        );
    },
    clearCanvas: function () {
        this.canvasCtx.clearRect(
            0,
            0,
            this.dimensions.WIDTH,
            this.dimensions.HEIGHT
        );
    },
    update: function () {
        this.drawPending = false;
        var now = getTimeStamp();
        var deltaTime = now - (this.time || now);
        this.time = now;
        if (this.activated) {
            this.clearCanvas();
            if (this.tRex.jumping) {
                this.tRex.updateJump(deltaTime, this.config);
            }
            this.runningTime += deltaTime;
            var hasObstacles = this.runningTime > this.config.CLEAR_TIME;
            // First jump triggers the intro.
            if (this.tRex.jumpCount == 1 && !this.playingIntro) {
                this.playIntro();
            }
            // The horizon doesn't move until the intro is over.
            if (this.playingIntro) {
                this.horizon.update(0, this.currentSpeed, hasObstacles);
            } else {
                deltaTime = !this.started ? 0 : deltaTime;
                this.horizon.update(
                    deltaTime,
                    this.currentSpeed,
                    hasObstacles
                );
            }

            // Check for collisions.
            var collision =
                hasObstacles &&
                checkForCollision(this.horizon.obstacles[0], this.tRex);
            if (!collision) {
                this.distanceRan +=
                    this.currentSpeed * deltaTime / this.msPerFrame;
                if (this.currentSpeed < this.config.MAX_SPEED) {
                    this.currentSpeed += this.config.ACCELERATION;
                }
            } else {
                this.gameOver();
            }
            if (
                this.distanceMeter.getActualDistance(this.distanceRan) >
                this.distanceMeter.maxScore
            ) {
                this.distanceRan = 0;
            }
            var playAcheivementSound = this.distanceMeter.update(
                deltaTime,
                Math.ceil(this.distanceRan)
            );
            if (playAcheivementSound) {
                this.playSound(this.soundFx.SCORE);
            }
        }
        if (!this.crashed) {
            this.tRex.update(deltaTime);
            this.raq();
        }
    },
    handleEvent: function (e) {
        return function (evtType, events) {
            switch (evtType) {
                case events.KEYDOWN:
                case events.TOUCHSTART:
                case events.MOUSEDOWN:
                    this.onKeyDown(e);
                    break;
                case events.KEYUP:
                case events.TOUCHEND:
                case events.MOUSEUP:
                    this.onKeyUp(e);
                    break;
            }
        }.bind(this)(e.type, Runner.events);
    },
    startListening: function () {
        // Keys.
        document.addEventListener(Runner.events.KEYDOWN, this);
        document.addEventListener(Runner.events.KEYUP, this);
        if (IS_MOBILE) {
            // Mobile only touch devices.
            this.touchController.addEventListener(
                Runner.events.TOUCHSTART,
                this
            );
            this.touchController.addEventListener(
                Runner.events.TOUCHEND,
                this
            );
            this.containerEl.addEventListener(
                Runner.events.TOUCHSTART,
                this
            );
        } else {
            // Mouse.
            document.addEventListener(Runner.events.MOUSEDOWN, this);
            document.addEventListener(Runner.events.MOUSEUP, this);
        }
    },
    stopListening: function () {
        document.removeEventListener(Runner.events.KEYDOWN, this);
        document.removeEventListener(Runner.events.KEYUP, this);
        if (IS_MOBILE) {
            this.touchController.removeEventListener(
                Runner.events.TOUCHSTART,
                this
            );
            this.touchController.removeEventListener(
                Runner.events.TOUCHEND,
                this
            );
            this.containerEl.removeEventListener(
                Runner.events.TOUCHSTART,
                this
            );
        } else {
            document.removeEventListener(Runner.events.MOUSEDOWN, this);
            document.removeEventListener(Runner.events.MOUSEUP, this);
        }
    },
    onKeyDown: function (e) {
        if (e.target != this.detailsButton) {
            if (
                !this.crashed &&
                (Runner.keycodes.JUMP[String(e.keyCode)] ||
                    e.type == Runner.events.TOUCHSTART)
            ) {
                if (!this.activated) {
                    this.loadSounds();
                    this.activated = true;
                }
                if (!this.tRex.jumping) {
                    this.playSound(this.soundFx.BUTTON_PRESS);
                    this.tRex.startJump();
                }
            }
            if (
                this.crashed &&
                e.type == Runner.events.TOUCHSTART &&
                e.currentTarget == this.containerEl
            ) {
                this.restart();
            }
        }
        // Speed drop, activated only when jump key is not pressed.
        if (Runner.keycodes.DUCK[e.keyCode] && this.tRex.jumping) {
            e.preventDefault();
            this.tRex.setSpeedDrop();
        }
    },
    onKeyUp: function (e) {
        var keyCode = String(e.keyCode);
        var isjumpKey =
            Runner.keycodes.JUMP[keyCode] ||
            e.type == Runner.events.TOUCHEND ||
            e.type == Runner.events.MOUSEDOWN;
        if (this.isRunning() && isjumpKey) {
            this.tRex.endJump();
        } else if (Runner.keycodes.DUCK[keyCode]) {
            this.tRex.speedDrop = false;
        } else if (this.crashed) {
            // Check that enough time has elapsed before allowing jump key to restart.
            var deltaTime = getTimeStamp() - this.time;
            if (
                Runner.keycodes.RESTART[keyCode] ||
                (e.type == Runner.events.MOUSEUP &&
                    e.target == this.canvas) ||
                (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
                    Runner.keycodes.JUMP[keyCode])
            ) {
                this.restart();
            }
        } else if (this.paused && isjumpKey) {
            this.play();
        }
    },
    raq: function () {
        if (!this.drawPending) {
            this.drawPending = true;
            this.raqId = requestAnimationFrame(this.update.bind(this));
        }
    },
    isRunning: function () {
        return !!this.raqId;
    },
    gameOver: function () {
        this.playSound(this.soundFx.HIT);
        vibrate(200);
        this.stop();
        this.crashed = true;
        this.distanceMeter.acheivement = false;
        this.tRex.update(100, Trex.status.CRASHED);
        // Game over panel.
        if (!this.gameOverPanel) {
            this.gameOverPanel = new GameOverPanel(
                this.canvas,
                this.images.TEXT_SPRITE,
                this.images.RESTART,
                this.dimensions
            );
        } else {
            this.gameOverPanel.draw();
        }
        // Update the high score.
        if (this.distanceRan > this.highestScore) {
            this.highestScore = Math.ceil(this.distanceRan);
            this.distanceMeter.setHighScore(this.highestScore);
        }
        // Reset the time clock.
        this.time = getTimeStamp();
    },
    stop: function () {
        this.activated = false;
        this.paused = true;
        cancelAnimationFrame(this.raqId);
        this.raqId = 0;
    },
    play: function () {
        if (!this.crashed) {
            this.activated = true;
            this.paused = false;
            this.tRex.update(0, Trex.status.RUNNING);
            this.time = getTimeStamp();
            this.update();
        }
    },
    restart: function () {
        if (!this.raqId) {
            this.playCount++;
            this.runningTime = 0;
            this.activated = true;
            this.crashed = false;
            this.distanceRan = 0;
            this.setSpeed(this.config.SPEED);
            this.time = getTimeStamp();
            this.containerEl.classList.remove(Runner.classes.CRASHED);
            this.clearCanvas();
            this.distanceMeter.reset(this.highestScore);
            this.horizon.reset();
            this.tRex.reset();
            this.playSound(this.soundFx.BUTTON_PRESS);
            this.update();
        }
    },
    onVisibilityChange: function (e) {
        if (document.hidden || document.webkitHidden || e.type == "blur") {
            this.stop();
        } else {
            this.play();
        }
    },
    playSound: function (soundBuffer) {
        if (soundBuffer) {
            var sourceNode = this.audioContext.createBufferSource();
            sourceNode.buffer = soundBuffer;
            sourceNode.connect(this.audioContext.destination);
            sourceNode.start(0);
        }
    }
};
// Updates the canvas size taking into account the backing store pixel ratio and the device pixel ratio.
// See article by Paul Lewis: https://www.html5rocks.com/en/tutorials/canvas/hidpi/
Runner.updateCanvasScaling = function (canvas, opt_width, opt_height) {
    var context = canvas.getContext("2d");
    // Query the various pixel ratios
    var devicePxRatio = Math.floor(window.devicePixelRatio) || 1;
    var backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
    var ratio = devicePxRatio / backingStoreRatio;
    // Upscale the canvas if the two ratios don't match
    if (ratio !== 1) {
        var oldWidth = opt_width || canvas.width;
        var oldHeight = opt_height || canvas.height;
        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;
        canvas.style.width = oldWidth + "px";
        canvas.style.height = oldHeight + "px";
        // Scale the context to counter the fact that we've manually scaled our canvas element.
        context.scale(ratio, ratio);
        return true;
    }
    return false;
};
var getRandomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
var vibrate = duration => navigator.vibrate(duration);
function createCanvas(container, width, height, opt_classname) {
    var canvas = document.createElement("canvas");
    canvas.className = opt_classname
        ? Runner.classes.CANVAS + " " + opt_classname
        : Runner.classes.CANVAS;
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    return canvas;
}
function decodeBase64ToArrayBuffer(base64String) {
    var len = base64String.length / 4 * 3;
    var str = atob(base64String);
    var arrayBuffer = new ArrayBuffer(len);
    var bytes = new Uint8Array(arrayBuffer);
    for (var i = 0; i < len; i++) {
        bytes[i] = str.charCodeAt(i);
    }
    return bytes.buffer;
}
function getTimeStamp() {
    return performance.now();
}