let websocketObj;

function connectWebsocket() {
    make_game_invisible()
    websocketObj = new WebSocket("ws://localhost:8765");
    websocketObj.onopen = (event) => {


        make_game_visible()
        // webSocket.send(JSON.stringify({ "data": url, "status": "play" }));
    };
    websocketObj.onmessage = (event) => {
//        console.log(event)
        if(JSON.parse(event.data).labels == "Jump") {
            makeJump()
        }
    };
}

function sendPlayStateToWebsocket(distance_to_obstacle, obstracle_width, obstacle_height, game_speed, action) {
    websocketObj.send(JSON.stringify({
        "data": {
            "distance_to_obstacle": distance_to_obstacle,
            "obstacle_width": obstracle_width,
            "obstacle_height": obstacle_height,
            "game_speed": game_speed,
            "action": action
        },
        "state": "playing"
    }))
}


function throttle(func, delay) {
  let timeoutId;
  return function() {
    const context = this;
    const args = arguments;
    if (!timeoutId) {
      timeoutId = setTimeout(function() {
        func.apply(context, args);
        timeoutId = null;
      }, delay);
    }
  }
}

const sendPlayStateImageThrottledFunction = throttle(function(action) {
  sendPlayStateImage(action);
}, 100);

function sendPlayStateImage(action) {

  // get the 2D rendering context
  const ctx = runnerObj.canvas.getContext("2d");

  // define the area to capture
  const x = 30;
  const y = 0;
  const width = 350;
  const height = 350;

  // extract the pixel data from the canvas
  const imageData = ctx.getImageData(x, y, width, height);

  // create a new canvas to hold the extracted pixels
  const newCanvas = document.createElement("canvas");
  newCanvas.width = width;
  newCanvas.height = height;

  // draw the extracted pixels onto the new canvas
  const newCtx = newCanvas.getContext("2d");
  newCtx.putImageData(imageData, 0, 0);

  // convert image to black and white
  for (let i = 0; i < imageData.data.length; i += 4) {
    const red = imageData.data[i];
    const green = imageData.data[i + 1];
    const blue = imageData.data[i + 2];
    const average = (red + green + blue) / 3;
    imageData.data[i] = average;
    imageData.data[i + 1] = average;
    imageData.data[i + 2] = average;
  }

  // compress the image
  newCanvas.toBlob(function(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function() {
      const base64data = reader.result.split(',')[1];
      // send base64data to server
      websocketObj.send(JSON.stringify({
        "data": {
          "image": base64data,
          "action": action
        },
        "state": "playing_base64image"
      }));
    }
  }, 'image/jpeg', 0.3);
}


const predictPlayViaImageThrottledFunction = throttle(predictPlayViaImage, 100);

function predictPlayViaImage() {
    // get the 2D rendering context
  const ctx = runnerObj.canvas.getContext("2d");

  // define the area to capture
  const x = 50;
  const y = 0;
  const width = 350;
  const height = 350;

  // extract the pixel data from the canvas
  const imageData = ctx.getImageData(x, y, width, height);

  // create a new canvas to hold the extracted pixels
  const newCanvas = document.createElement("canvas");
  newCanvas.width = width;
  newCanvas.height = height;

  // draw the extracted pixels onto the new canvas
  const newCtx = newCanvas.getContext("2d");
  newCtx.putImageData(imageData, 0, 0);

  // convert image to black and white
  for (let i = 0; i < imageData.data.length; i += 4) {
    const red = imageData.data[i];
    const green = imageData.data[i + 1];
    const blue = imageData.data[i + 2];
    const average = (red + green + blue) / 3;
    imageData.data[i] = average;
    imageData.data[i + 1] = average;
    imageData.data[i + 2] = average;
  }

  // compress the image
  newCanvas.toBlob(function(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function() {
      const base64data = reader.result.split(',')[1];
      // send base64data to server

    websocketObj.send(JSON.stringify({
            "data": {
                "image": base64data,
            },
            "state": "predict_base64Image"
        }))
    }
  }, 'image/jpeg', 0.3);

}

function sendEndOfPlayStateToWebsocket() {
    websocketObj.send(JSON.stringify({
        "state": "crashed"
    }))
}

function predictPlay(distance_to_obstacle, obstracle_width, obstacle_height, game_speed) {
    websocketObj.send(JSON.stringify({
            "data": {
                "distance_to_obstacle": distance_to_obstacle,
                "obstacle_width": obstracle_width,
                "obstacle_height": obstacle_height,
                "game_speed": game_speed
            },
            "state": "predict"
        }))
}

function make_game_visible() {
    document.getElementById("websocket_state").style.display = "none";
}

function make_game_invisible() {
    document.getElementById("websocket_state").style.display = "flex";
}

function getClippedRegion(image, x, y, width, height) {
    var img = new Image();
    img.src = image
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    //                   source region         dest. region
    ctx.drawImage(img, x, y, width, height,  0, 0, width, height);

    return canvas;
}



function sendPlayStateToWebsocketForAIPlayer(distance_to_obstacle, obstracle_width, obstacle_height, game_speed, action) {
    if(distance_to_obstacle < 100) {
       makeJump()
    }
}


function predictPlayForAIPlayer(distance_to_obstacle, obstracle_width, obstacle_height, game_speed) {
    if(game_speed < 7) {
        var num = 100 + Math.floor(Math.random() * 30);
        if(distance_to_obstacle < num) {
           makeJump()
        }
    } else if(game_speed < 8) {
        var num = 110 + Math.floor(Math.random() * 20);
        if(distance_to_obstacle < 100) {
           makeJump()
        }
    } else if (game_speed , 9) {
        var num = 130 + Math.floor(Math.random() * 10);
         if(distance_to_obstacle < num) {
           makeJump()
        }
    }

}