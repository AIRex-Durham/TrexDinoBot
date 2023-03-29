let websocketObj;

function connectWebsocket() {
    websocketObj = new WebSocket("ws://localhost:8765");
    websocketObj.onopen = (event) => {
        var url = runnerObj.canvas.toDataURL();

        // webSocket.send(JSON.stringify({ "data": url, "status": "play" }));
    };
    websocketObj.onmessage = (event) => {
        console.log(event.data);
    };
}

function sendPlayStateToWebsocket(distance_to_obstacle, obstracle_width, obstacle_height, game_speed, action) {
    websocketObj.send(JSON.stringify({
        "data": {
            "distance_to_obstacle": distance_to_obstacle,
            "obstacle_width": obstracle_width,
            "obstacle_height": obstacle_height,
            "game_speed": game_speed,
            "action": action,
            'state': null
        },
        "state": "playing"
    }))
}

function sendEndOfPlayStateToWebsocket() {
    websocketObj.send(JSON.stringify({
        "state": "end"
    }))
}

function predictPlay(distance_to_obstacle, obstracle_width, obstacle_height, game_speed) {
    websocketObj.send(JSON.stringify({
            "data": {
                "distance_to_obstacle": distance_to_obstacle,
                "obstacle_width": obstracle_width,
                "obstacle_height": obstacle_height,
                "game_speed": game_speed,
                'state': null
            },
            "state": "predict"
        }))
}