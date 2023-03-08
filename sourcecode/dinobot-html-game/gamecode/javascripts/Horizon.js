function HorizonLine(canvas, bgImg) {
    this.image = bgImg;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d");
    this.sourceDimensions = {};
    this.dimensions = HorizonLine.dimensions;
    this.sourceXPos = [0, this.dimensions.WIDTH];
    this.xPos = [];
    this.yPos = 0;
    this.bumpThreshold = 0.5;
    this.setSourceDimensions();
    this.draw();
}
HorizonLine.dimensions = {
    WIDTH: 600,
    HEIGHT: 12,
    YPOS: 127
};
HorizonLine.prototype = {
    setSourceDimensions: function () {
        for (var dimension in HorizonLine.dimensions) {
            if (IS_HIDPI) {
                if (dimension != "YPOS") {
                    this.sourceDimensions[dimension] =
                        HorizonLine.dimensions[dimension] * 2;
                }
            } else {
                this.sourceDimensions[dimension] =
                    HorizonLine.dimensions[dimension];
            }
            this.dimensions[dimension] = HorizonLine.dimensions[dimension];
        }
        this.xPos = [0, HorizonLine.dimensions.WIDTH];
        this.yPos = HorizonLine.dimensions.YPOS;
    },
    getRandomType: function () {
        return Math.random() > this.bumpThreshold
            ? this.dimensions.WIDTH
            : 0;
    },
    draw: function () {
        this.canvasCtx.drawImage(
            this.image,
            this.sourceXPos[0],
            0,
            this.sourceDimensions.WIDTH,
            this.sourceDimensions.HEIGHT,
            this.xPos[0],
            this.yPos,
            this.dimensions.WIDTH,
            this.dimensions.HEIGHT
        );
        this.canvasCtx.drawImage(
            this.image,
            this.sourceXPos[1],
            0,
            this.sourceDimensions.WIDTH,
            this.sourceDimensions.HEIGHT,
            this.xPos[1],
            this.yPos,
            this.dimensions.WIDTH,
            this.dimensions.HEIGHT
        );
    },
    updateXPos: function (pos, increment) {
        var line1 = pos;
        var line2 = pos == 0 ? 1 : 0;
        this.xPos[line1] -= increment;
        this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;
        if (this.xPos[line1] <= -this.dimensions.WIDTH) {
            this.xPos[line1] += this.dimensions.WIDTH * 2;
            this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
            this.sourceXPos[line1] = this.getRandomType();
        }
    },
    update: function (deltaTime, speed) {
        var increment = Math.floor(speed * (FPS / 1000) * deltaTime);
        if (this.xPos[0] <= 0) {
            this.updateXPos(0, increment);
        } else {
            this.updateXPos(1, increment);
        }
        this.draw();
    },
    reset: function () {
        this.xPos[0] = 0;
        this.xPos[1] = HorizonLine.dimensions.WIDTH;
    }
};
function Horizon(canvas, images, dimensions, gapCoefficient) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext("2d");
    this.config = Horizon.config;
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;
    this.obstacles = [];
    this.horizonOffsets = [0, 0];
    this.cloudFrequency = this.config.CLOUD_FREQUENCY;
    // Cloud
    this.clouds = [];
    this.cloudImg = images.CLOUD;
    this.cloudSpeed = this.config.BG_CLOUD_SPEED;
    // Horizon
    this.horizonImg = images.HORIZON;
    this.horizonLine = null;
    // Obstacles
    this.obstacleImgs = {
        CACTUS_SMALL: images.CACTUS_SMALL,
        CACTUS_LARGE: images.CACTUS_LARGE
    };
    this.init();
}
Horizon.config = {
    BG_CLOUD_SPEED: 0.2,
    BUMPY_THRESHOLD: 0.3,
    CLOUD_FREQUENCY: 0.5,
    HORIZON_HEIGHT: 16,
    MAX_CLOUDS: 6
};
Horizon.prototype = {
    init: function () {
        this.addCloud();
        this.horizonLine = new HorizonLine(this.canvas, this.horizonImg);
    },
    // updateObstacles used as an override to prevent the obstacles from being updated / added in the ease in section.
    update: function (deltaTime, currentSpeed, updateObstacles) {
        this.runningTime += deltaTime;
        this.horizonLine.update(deltaTime, currentSpeed);
        this.updateClouds(deltaTime, currentSpeed);
        if (updateObstacles) {
            this.updateObstacles(deltaTime, currentSpeed);
        }
    },
    updateClouds: function (deltaTime, speed) {
        var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
        var numClouds = this.clouds.length;
        if (numClouds) {
            for (var i = numClouds - 1; i >= 0; i--) {
                this.clouds[i].update(cloudSpeed);
            }
            var lastCloud = this.clouds[numClouds - 1];
            // Check for adding a new cloud.
            if (
                numClouds < this.config.MAX_CLOUDS &&
                this.dimensions.WIDTH - lastCloud.xPos >
                lastCloud.cloudGap &&
                this.cloudFrequency > Math.random()
            ) {
                this.addCloud();
            }
            // Remove expired clouds.
            this.clouds = this.clouds.filter(function (obj) {
                return !obj.remove;
            });
        }
    },
    updateObstacles: function (deltaTime, currentSpeed) {
        // Obstacles, move to Horizon layer.
        var updatedObstacles = this.obstacles.slice(0);
        for (var i = 0; i < this.obstacles.length; i++) {
            var obstacle = this.obstacles[i];
            obstacle.update(deltaTime, currentSpeed);
            // Clean up existing obstacles.
            if (obstacle.remove) {
                updatedObstacles.shift();
            }
        }
        this.obstacles = updatedObstacles;
        if (this.obstacles.length > 0) {
            var lastObstacle = this.obstacles[this.obstacles.length - 1];
            if (
                lastObstacle &&
                !lastObstacle.followingObstacleCreated &&
                lastObstacle.isVisible() &&
                lastObstacle.xPos + lastObstacle.width + lastObstacle.gap <
                this.dimensions.WIDTH
            ) {
                this.addNewObstacle(currentSpeed);
                lastObstacle.followingObstacleCreated = true;
            }
        } else {
            // Create new obstacles.
            this.addNewObstacle(currentSpeed);
        }
    },
    addNewObstacle: function (currentSpeed) {
        var obstacleType = generateRandomObstacleType();
        if (obstacleType != null) {
            var obstacleImg = this.obstacleImgs[obstacleType.type];
            this.obstacles.push(
                new Obstacle(
                    this.canvasCtx,
                    obstacleType,
                    obstacleImg,
                    this.dimensions,
                    this.gapCoefficient,
                    currentSpeed
                )
            );
        }
    },
    reset: function () {
        this.obstacles = [];
        this.horizonLine.reset();
    },
    resize: function (width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    },
    addCloud: function () {
        this.clouds.push(
            new Cloud(this.canvas, this.cloudImg, this.dimensions.WIDTH)
        );
    }
};

