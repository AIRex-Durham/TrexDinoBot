let websocketObj;

function connectWebsocket() {
    make_game_invisible()
    websocketObj = new WebSocket("ws://localhost:8765");
    websocketObj.onopen = (event) => {


        make_game_visible()
        // webSocket.send(JSON.stringify({ "data": url, "status": "play" }));
    };
    websocketObj.onmessage = (event) => {
        console.log(event)
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

function sendPlayStateImage(action) {
    var base64Image = runnerObj.canvas.toDataURL().split(',')[1];
    websocketObj.send(JSON.stringify({
            "data": {
                "image": base64Image,
                "action": action
            },
            "state": "playing_base64image"
        }))
}

function predictPlayViaImage() {
    var base64Image = runnerObj.canvas.toDataURL().split(',')[1];
    websocketObj.send(JSON.stringify({
            "data": {
                "image": base64Image
            },
            "state": "predict_base64Image"
        }))
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