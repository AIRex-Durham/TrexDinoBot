function DistanceMeter(canvas, spriteSheet, canvasWidth) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d");
    this.image = spriteSheet;
    this.x = 0;
    this.y = 5;
    this.currentDistance = 0;
    this.maxScore = 0;
    this.highScore = 0;
    this.container = null;
    this.digits = [];
    this.acheivement = false;
    this.defaultString = "";
    this.flashTimer = 0;
    this.flashIterations = 0;
    this.config = DistanceMeter.config;
    this.init(canvasWidth);
}
DistanceMeter.dimensions = {
    WIDTH: 10,
    HEIGHT: 13,
    DEST_WIDTH: 11
};
DistanceMeter.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];
DistanceMeter.config = {
    // Number of digits.
    MAX_DISTANCE_UNITS: 5,
    // Distance that causes achievement animation.
    ACHIEVEMENT_DISTANCE: 100,
    // Used for conversion from pixel distance to a scaled unit.
    COEFFICIENT: 0.025,
    // Flash duration in milliseconds.
    FLASH_DURATION: 1000 / 4,
    // Flash iterations for achievement animation.
    FLASH_ITERATIONS: 3
};
DistanceMeter.prototype = {
    init: function (width) {
        var maxDistanceStr = "";
        this.calcXPos(width);
        this.maxScore = this.config.MAX_DISTANCE_UNITS;
        for (var i = 0; i < this.config.MAX_DISTANCE_UNITS; i++) {
            this.draw(i, 0);
            this.defaultString += "0";
            maxDistanceStr += "9";
        }
        this.maxScore = parseInt(maxDistanceStr);
    },
    calcXPos: function (canvasWidth) {
        this.x =
            canvasWidth -
            DistanceMeter.dimensions.DEST_WIDTH *
            (this.config.MAX_DISTANCE_UNITS + 1);
    },
    draw: function (digitPos, value, opt_highScore) {
        var sourceWidth = DistanceMeter.dimensions.WIDTH;
        var sourceHeight = DistanceMeter.dimensions.HEIGHT;
        var sourceX = DistanceMeter.dimensions.WIDTH * value;
        var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
        var targetY = this.y;
        var targetWidth = DistanceMeter.dimensions.WIDTH;
        var targetHeight = DistanceMeter.dimensions.HEIGHT;
        // For high DPI we 2x source values.
        if (IS_HIDPI) {
            sourceWidth *= 2;
            sourceHeight *= 2;
            sourceX *= 2;
        }
        this.canvasCtx.save();
        if (opt_highScore) {
            // Left of the current score.
            var highScoreX =
                this.x -
                this.config.MAX_DISTANCE_UNITS *
                2 *
                DistanceMeter.dimensions.WIDTH;
            this.canvasCtx.translate(highScoreX, this.y);
        } else {
            this.canvasCtx.translate(this.x, this.y);
        }
        this.canvasCtx.drawImage(
            this.image,
            sourceX,
            0,
            sourceWidth,
            sourceHeight,
            targetX,
            targetY,
            targetWidth,
            targetHeight
        );
        this.canvasCtx.restore();
    },
    getActualDistance: function (distance) {
        return distance
            ? Math.round(distance * this.config.COEFFICIENT)
            : 0;
    },
    update: function (deltaTime, distance) {
        var paint = true;
        var playSound = false;
        if (!this.acheivement) {
            distance = this.getActualDistance(distance);
            if (distance > 0) {
                // Acheivement unlocked
                if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
                    // Flash score and play sound.
                    this.acheivement = true;
                    this.flashTimer = 0;
                    playSound = true;
                }
                // Create a string representation of the distance with leading 0.
                var distanceStr = (this.defaultString + distance).substr(
                    -this.config.MAX_DISTANCE_UNITS
                );
                this.digits = distanceStr.split("");
            } else {
                this.digits = this.defaultString.split("");
            }
        } else {
            // Control flashing of the score on reaching acheivement.
            if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
                this.flashTimer += deltaTime;
                if (this.flashTimer < this.config.FLASH_DURATION) {
                    paint = false;
                } else if (
                    this.flashTimer >
                    this.config.FLASH_DURATION * 2
                ) {
                    this.flashTimer = 0;
                    this.flashIterations++;
                }
            } else {
                this.acheivement = false;
                this.flashIterations = 0;
                this.flashTimer = 0;
            }
        }
        // Draw the digits if not flashing.
        if (paint) {
            for (var i = this.digits.length - 1; i >= 0; i--) {
                this.draw(i, parseInt(this.digits[i]));
            }
        }
        this.drawHighScore();
        return playSound;
    },
    drawHighScore: function () {
        this.canvasCtx.save();
        this.canvasCtx.globalAlpha = 0.8;
        for (var i = this.highScore.length - 1; i >= 0; i--) {
            this.draw(i, parseInt(this.highScore[i], 10), true);
        }
        this.canvasCtx.restore();
    },
    setHighScore: function (distance) {
        distance = this.getActualDistance(distance);
        var highScoreStr = (this.defaultString + distance).substr(
            -this.config.MAX_DISTANCE_UNITS
        );
        this.highScore = ["10", "11", ""].concat(highScoreStr.split(""));
    },
    reset: function () {
        this.update(0);
        this.acheivement = false;
    }
};