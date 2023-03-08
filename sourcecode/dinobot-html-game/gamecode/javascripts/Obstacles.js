Obstacle.types = [
    {
        type: "CACTUS_SMALL",
        className: " cactus cactus-small ",
        width: 17,
        height: 35,
        yPos: 105,
        multipleSpeed: 3,
        minGap: 120,
        collisionBoxes: [
            new CollisionBox(0, 7, 5, 27, true, 1),
            new CollisionBox(4, 0, 6, 34, true, 2),
            new CollisionBox(10, 4, 7, 14, true, 3)
        ]
    },
    {
        type: "CACTUS_LARGE",
        className: " cactus cactus-large ",
        width: 25,
        height: 50,
        yPos: 90,
        multipleSpeed: 6,
        minGap: 120,
        collisionBoxes: [
            new CollisionBox(0, 12, 7, 38, true, 1),
            new CollisionBox(8, 0, 7, 49, true, 2),
            new CollisionBox(13, 10, 10, 38, true, 3)
        ]
    }
];
function GameOverPanel(canvas, textSprite, restartImg, dimensions) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d");
    this.canvasDimensions = dimensions;
    this.textSprite = textSprite;
    this.restartImg = restartImg;
    this.draw();
}
GameOverPanel.dimensions = {
    TEXT_X: 0,
    TEXT_Y: 13,
    TEXT_WIDTH: 191,
    TEXT_HEIGHT: 11,
    RESTART_WIDTH: 36,
    RESTART_HEIGHT: 32
};
GameOverPanel.prototype = {
    updateDimensions: function (width, opt_height) {
        this.canvasDimensions.WIDTH = width;
        if (opt_height) {
            this.canvasDimensions.HEIGHT = opt_height;
        }
    },
    draw: function () {
        var dimensions = GameOverPanel.dimensions;
        var centerX = this.canvasDimensions.WIDTH / 2;
        // Game over text.
        var textSourceX = dimensions.TEXT_X;
        var textSourceY = dimensions.TEXT_Y;
        var textSourceWidth = dimensions.TEXT_WIDTH;
        var textSourceHeight = dimensions.TEXT_HEIGHT;
        var textTargetX = Math.round(centerX - dimensions.TEXT_WIDTH / 2);
        var textTargetY = Math.round(
            (this.canvasDimensions.HEIGHT - 25) / 3
        );
        var textTargetWidth = dimensions.TEXT_WIDTH;
        var textTargetHeight = dimensions.TEXT_HEIGHT;
        var restartSourceWidth = dimensions.RESTART_WIDTH;
        var restartSourceHeight = dimensions.RESTART_HEIGHT;
        var restartTargetX = centerX - dimensions.RESTART_WIDTH / 2;
        var restartTargetY = this.canvasDimensions.HEIGHT / 2;
        if (IS_HIDPI) {
            textSourceY *= 2;
            textSourceX *= 2;
            textSourceWidth *= 2;
            textSourceHeight *= 2;
            restartSourceWidth *= 2;
            restartSourceHeight *= 2;
        }
        // Game over text from sprite.
        this.canvasCtx.drawImage(
            this.textSprite,
            textSourceX,
            textSourceY,
            textSourceWidth,
            textSourceHeight,
            textTargetX,
            textTargetY,
            textTargetWidth,
            textTargetHeight
        );
        // Restart button.
        this.canvasCtx.drawImage(
            this.restartImg,
            0,
            0,
            restartSourceWidth,
            restartSourceHeight,
            restartTargetX,
            restartTargetY,
            dimensions.RESTART_WIDTH,
            dimensions.RESTART_HEIGHT
        );
    }
};

function checkForCollision(obstacle, tRex, opt_canvasCtx) {
    if (obstacle == null)
        return false;
    var obstacleBoxXPos = Runner.defaultDimensions.WIDTH + obstacle.xPos;
    // Adjustments are made to the bounding box as there is a 1 pixel white
    // border around the t-rex and obstacles.
    var tRexBox = new CollisionBox(
        tRex.xPos + 1,
        tRex.yPos + 1,
        tRex.config.WIDTH - 2,
        tRex.config.HEIGHT - 2
    );
    var obstacleBox = new CollisionBox(
        obstacle.xPos + 1,
        obstacle.yPos + 1,
        obstacle.typeConfig.width * obstacle.size - 2,
        obstacle.typeConfig.height - 2
    );
    // Debug outer box
    if (opt_canvasCtx) {
        drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
    }
    // Simple outer bounds check.
    if (boxCompare(tRexBox, obstacleBox)) {
        var collisionBoxes = obstacle.collisionBoxes;
        var tRexCollisionBoxes = Trex.collisionBoxes;
        // Detailed axis aligned box check.
        for (var t = 0; t < tRexCollisionBoxes.length; t++) {
            for (var i = 0; i < collisionBoxes.length; i++) {
                // Adjust the box to actual positions.
                var adjTrexBox = createAdjustedCollisionBox(
                    tRexCollisionBoxes[t],
                    tRexBox
                );
                var adjObstacleBox = createAdjustedCollisionBox(
                    collisionBoxes[i],
                    obstacleBox
                );
                var crashed = boxCompare(adjTrexBox, adjObstacleBox);
                // Draw boxes for debug.
                if (opt_canvasCtx) {
                    drawCollisionBoxes(
                        opt_canvasCtx,
                        adjTrexBox,
                        adjObstacleBox
                    );
                }
                if (crashed) {
                    return [adjTrexBox, adjObstacleBox];
                }
            }
        }
    }
    return false;
}
function createAdjustedCollisionBox(box, adjustment) {
    return new CollisionBox(
        box.x + adjustment.x,
        box.y + adjustment.y,
        box.width,
        box.height
    );
}
function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox) {
    canvasCtx.save();
    canvasCtx.strokeStyle = "#f00";
    canvasCtx.strokeRect(
        tRexBox.x,
        tRexBox.y,
        tRexBox.width,
        tRexBox.height
    );
    canvasCtx.strokeStyle = "#0f0";
    canvasCtx.strokeRect(
        obstacleBox.x,
        obstacleBox.y,
        obstacleBox.width,
        obstacleBox.height
    );
    canvasCtx.restore();
}
function boxCompare(tRexBox, obstacleBox) {
    var crashed = false;
    var tRexBoxX = tRexBox.x;
    var tRexBoxY = tRexBox.y;
    var obstacleBoxX = obstacleBox.x;
    var obstacleBoxY = obstacleBox.y;
    // Axis-Aligned Bounding Box method.
    if (
        tRexBox.x < obstacleBoxX + obstacleBox.width &&
        tRexBox.x + tRexBox.width > obstacleBoxX &&
        tRexBox.y < obstacleBox.y + obstacleBox.height &&
        tRexBox.height + tRexBox.y > obstacleBox.y
    ) {
        crashed = true;
    }
    return crashed;
}

function CollisionBox(x, y, w, h, enabled, index) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.enabled = enabled;
    this.index = index;
}

function Obstacle(
    canvasCtx,
    type,
    obstacleImg,
    dimensions,
    gapCoefficient,
    speed
) {
    this.canvasCtx = canvasCtx;
    this.image = obstacleImg;
    this.typeConfig = type;
    this.gapCoefficient = gapCoefficient;
    filteredCollisionBoxes = type.collisionBoxes.filter((it) => it.enabled);
    this.size = filteredCollisionBoxes[getRandomNum(1, filteredCollisionBoxes.length) - 1].index;
    this.dimensions = dimensions;
    this.remove = false;
    this.xPos = 0;
    this.yPos = this.typeConfig.yPos;
    this.width = 0;
    this.collisionBoxes = [];
    this.gap = 0;
    this.init(speed);
}
Obstacle.MAX_GAP_COEFFICIENT = 1.5;
Obstacle.MAX_OBSTACLE_LENGTH = 3;
Obstacle.prototype = {
    init: function (speed) {
        this.cloneCollisionBoxes();
        // Only allow sizing if we're at the right speed.
        if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
            this.size = 1;
        }
        this.width = this.typeConfig.width * this.size;
        this.xPos = this.dimensions.WIDTH - this.width;
        this.draw();
        // Make collision box adjustments,
        // Central box is adjusted to the size as one box.
        // | |<->| | | |<--->| | | |<----->| |
        // | | 1 | | | |  2  | | | |   3   | |
        // |_|___|_| |_|_____|_| |_|_______|_|
        if (this.size > 1) {
            this.collisionBoxes[1].width =
                this.width -
                this.collisionBoxes[0].width -
                this.collisionBoxes[2].width;
            this.collisionBoxes[2].x =
                this.width - this.collisionBoxes[2].width;
        }
        this.gap = this.getGap(this.gapCoefficient, speed);
    },
    draw: function () {
        var sourceWidth = this.typeConfig.width;
        var sourceHeight = this.typeConfig.height;
        if (IS_HIDPI) {
            sourceWidth = sourceWidth * 2;
            sourceHeight = sourceHeight * 2;
        }
        // Sprite
        var sourceX = sourceWidth * this.size * (0.5 * (this.size - 1));
        this.canvasCtx.drawImage(
            this.image,
            sourceX,
            0,
            sourceWidth * this.size,
            sourceHeight,
            this.xPos,
            this.yPos,
            this.typeConfig.width * this.size,
            this.typeConfig.height
        );
    },
    update: function (deltaTime, speed) {
        if (!this.remove) {
            this.xPos -= Math.floor(speed * FPS / 1000 * deltaTime);
            this.draw();
            if (!this.isVisible()) {
                this.remove = true;
            }
        }
    },
    getGap: function (gapCoefficient, speed) {
        var minGap = Math.round(
            this.width * speed + this.typeConfig.minGap * gapCoefficient
        );
        var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
        return getRandomNum(minGap, maxGap);
    },
    isVisible: function () {
        return this.xPos + this.width > 0;
    },
    cloneCollisionBoxes: function () {
        var collisionBoxes = this.typeConfig.collisionBoxes;
        for (var i = collisionBoxes.length - 1; i >= 0; i--) {
            this.collisionBoxes[i] = new CollisionBox(
                collisionBoxes[i].x,
                collisionBoxes[i].y,
                collisionBoxes[i].width,
                collisionBoxes[i].height
            );
        }
    }
};


function loadObstaclesForChoice(runner) {
    obstacle_choices = document.querySelector("#obstacle_choices")

    choices = ""
    images = runner.images;
    searchCanvasIds = []
    for (i = 0; i < Obstacle.types.length; i++) {
        obstacle = Obstacle.types[i]

        for (size = 1; size <= Obstacle.MAX_OBSTACLE_LENGTH; size++) {
            obj = {
                canvasId: "obstacle_canvas_" + i + "_" + size,
                inputId: 'obstacle_' + i + '_' + size + '_input',
                sWidth: obstacle.width * (size),
                sx: obstacle.width * (size) * (0.5 * (size - 1)),
                width: obstacle.width * (size),
                height: obstacle.height,
                yPos: obstacle.yPos,
                sourceWidth: obstacle.width,
                img: images[Obstacle.types[i].type],
                typeIndex: i,
                boxIndex: size - 1,
            }

            searchCanvasIds.push(obj)
            choices += '<div style="width: 100px; display: grid; grid-row-gap:10px;justify-content: center;align-items: center;align-content: center;"><input type="checkbox" id=' + obj.inputId + ' value="' + i + '_obstacle" checked="true"></input> <canvas  id=' + obj.canvasId + ' class="obstacle_choices" tag="' + i + '_' + size + ' style="width:100px;height:35px;"></canvas></div>'
        }
    }

    obstacle_choices.innerHTML = choices

    for (i = 0; i < searchCanvasIds.length; i++) {
        canvas = document.querySelector("#" + searchCanvasIds[i].canvasId)

        canvas.width = searchCanvasIds[i].width;
        canvas.height = searchCanvasIds[i].height;
        // Get the canvas context
        var ctx = canvas.getContext("2d");

        // Draw the cropped image onto the canvas
        ctx.drawImage(
            searchCanvasIds[i].img,
            searchCanvasIds[i].sx,
            0,
            searchCanvasIds[i].sWidth,
            searchCanvasIds[i].height,
            0,
            0,
            searchCanvasIds[i].sWidth,
            searchCanvasIds[i].height);

        inputBox = document.querySelector("#" + searchCanvasIds[i].inputId)
        var typeIndex = searchCanvasIds[i].typeIndex;
        var boxIndex = searchCanvasIds[i].boxIndex;
        addEventListenerForInputBox(typeIndex, boxIndex, inputBox)
    }
}

function addEventListenerForInputBox(typeIndex, boxIndex, inputBox) {
    inputBox.addEventListener('change', (changeValue) => {
        Obstacle.types[typeIndex].collisionBoxes[boxIndex].enabled = changeValue.target.checked;
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRandomObstacleType() {
    countOuterTypes = 0
    var tempArray = []
    countOuterTypes += Obstacle.types[0].collisionBoxes.filter((it) => it.enabled).length > 0 ? 1 : 0;
    if (countOuterTypes > 0) {
        tempArray.push(Obstacle.types[0])
    }
    var tempcountOuterTypesLength = countOuterTypes
    countOuterTypes += Obstacle.types[1].collisionBoxes.filter((it) => it.enabled).length > 0 ? 1 : 0;
    if (countOuterTypes != tempcountOuterTypesLength) {
        tempArray.push(Obstacle.types[1])
    }
    if (countOuterTypes == 0)
        return null;
    if (countOuterTypes > 0) {
        return tempArray[getRandomNum(0, countOuterTypes)];
    }
    return null;
}