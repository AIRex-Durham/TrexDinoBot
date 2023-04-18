// Game configuration
const GAME_WIDTH = 640;
const GAME_HEIGHT = 480;
const GAME_BACKGROUND_COLOR = '#f7f7f7';
const GAME_CONTAINER_ID = '.main-container';

// RL model configuration
const GAME_STATE_SIZE = 5;
const NUM_ACTIONS = 2; // number of possible actions (do nothing, jump)
const DISCOUNT_FACTOR = 0.9; // discount factor for future rewards
const NUM_EPISODES = 300; // number of training episodes
const BATCH_SIZE = 32; // batch size for training the RL model
const LEARNING_RATE = 0.001; // learning rate for the optimizer

// Game state configuration
const CACTUS_MIN_DISTANCE = 100; // minimum distance between two cacti
const CACTUS_MAX_DISTANCE = 400; // maximum distance between two cacti
const CACTUS_MIN_SPEED = 2; // minimum speed of cacti
const CACTUS_MAX_SPEED = 6; // maximum speed of cacti
const TREX_START_Y = 370; // starting y position of TRex
const TREX_JUMP_SPEED = 10; // speed of TRex jump
const TREX_GRAVITY = 0.5; // gravity affecting TRex during jump
const GROUND_Y = 400; // y position of ground
function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getState(runner) {
    const player = runner.tRex;
    const obstacles = runner.horizon.obstacles;

    const nextObstacle = obstacles[0];
    const distanceToNextObstacle = nextObstacle ? nextObstacle.xPos - player.xPos : null;

    return [
        runner.currentSpeed,
        runner.trexbot_jumping,
        distanceToNextObstacle,
        runner.horizon.obstacles.length,
        runner.distanceRan
    ];
}

async function startRLTraining(runner) {
    // Define the RL model
    const model = tf.sequential();
    model.add(tf.layers.dense({
        inputShape: [GAME_STATE_SIZE],
        units: NUM_ACTIONS,
        activation: 'softmax'
    }));
    const optimizer = tf.train.adam();
    model.compile({ optimizer: optimizer, loss: 'categoricalCrossentropy' });

    // Train the RL model
    let epsilon = 1.0;
    const epsilonDecay = 0.99; // decay factor for epsilon
    const minEpsilon = 0.01; // minimum value for epsilon
    // Train the RL model
    for (let i = 0; i < NUM_EPISODES; i++) {
        if (runner.crashed) {
            startGameForTraining();
        }
        let state = getState(runner); // get initial state
        if (state[2] > 200) {
            let totalReward = 0;
            while (!runner.crashed) {
                // Choose an action based on the RL model's prediction
                const prediction = model.predict(tf.tensor(state, [1, GAME_STATE_SIZE]));
                // Choose an action based on the RL model's prediction
                let action;
                if (Math.random() < epsilon) {
                    action = Math.floor(Math.random() * NUM_ACTIONS); // choose a random action
                } else {
                    const prediction = model.predict(tf.tensor(state, [1, GAME_STATE_SIZE]));
                    action = tf.argMax(prediction, 1).dataSync()[0]; // choose the optimal action
                }
                // Execute the action and observe the reward and new state
                const reward = await makeJumpViaBot(action);
                var nextState = getState(runner);
                if (nextState[2] > 200) {
                    await delay(40);
                    nextState = getState(runner);
                }

                console.log(action, reward);
                totalReward += reward;
                // Update the RL model with the new experience
                const target = model.predict(tf.tensor(nextState, [1, GAME_STATE_SIZE]));
                const targetValue = reward + DISCOUNT_FACTOR * tf.max(target, 1).dataSync()[0];
                const targetArray = Array(NUM_ACTIONS).fill(0);
                targetArray[action] = targetValue;
                const targetTensor = tf.tensor(targetArray, [1, NUM_ACTIONS]);
                const history = await model.fit(tf.tensor(state, [1, GAME_STATE_SIZE]), targetTensor);
                // Update the current state
                state = nextState;
            }
            console.log(`Episode ${i}: total reward = ${totalReward}`);
            // Decay epsilon
            epsilon = Math.max(epsilon * epsilonDecay, minEpsilon);
        } else {
            await delay(100);
        }
    }

    // Save the RL model
    await model.save('localstorage://my-model');
}