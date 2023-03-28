import tensorflow as tf
import numpy as np
import pandas as pd
import random
import json


class Train:
    def __init__(self, websocket):
        self.websocket = websocket
        self.X = None
        self.Y = None
        self.y = None
        self.websocket = None
        self.state_space = []
        self.action_space = []
        self.num_episodes = 1000
        self.gamma = 0.95

    async def handle_message(self, message):
        message_json = json.loads(message)
        if message_json['state'] == 'end':
            await self.start_training()
        elif message_json['state'] == 'playing':
            # Step 2: Define the state space and action space
            # Define the same state and action space as in the RL agent approach
            self.state_space.append({
                "distance_to_obstacle": message_json['data']['distance_to_obstacle'],
                "obstacle_width": message_json['data']['obstacle_width'],
                "obstacle_height": message_json['data']['obstacle_height'],
                "game_speed": message_json['data']['game_speed'],
                # "action": message_json['data']['action'],
            })
            self.action_space.append(message_json['data']['action'])
        self.websocket.send_message(message)

    async def start_training(self):
        self.X = self.state_space
        self.Y = self.action_space

        self.y = pd.get_dummies(self.Y)

        if self.X is None or self.Y is None or self.y is None:
            return

        # Define hyperparameters
        gamma = 0.95
        num_episodes = 1000
        input_size = self.X.shape[1]
        output_size = self.y.shape[1]

        # Define model
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(64, activation='relu', input_shape=(input_size,)),
            tf.keras.layers.Dense(output_size, activation='softmax')
        ])

        # Train model
        model.compile(optimizer='adam',
                      loss='categorical_crossentropy',
                      metrics=['accuracy'])

        # Iterate through multiple episodes of the game
        for episode in range(num_episodes):
            # Shuffle the data for each episode
            self.X, self.y = self.shuffle(self.X, self.y)

            # Run the model on each data point in the shuffled dataset
            for i in range(self.X.shape[0]):
                # Get the current state and corresponding label from the shuffled dataset
                state = np.array(self.X.iloc[i]).reshape(1, -1)
                label = np.array(self.y.iloc[i]).reshape(1, -1)

                # Use the model to choose an action
                action = self.choose_action(state, model)

                # Update the model weights based on the observed state, action, reward, and next state
                self.update_model(state, action, label, model, gamma)

            # Print the episode number at the end of each episode
            print(f"Episode {episode + 1} complete")

        model.save("trained")

    # Shuffle function to randomize the order of the dataset

    def shuffle(self, X, y):
        index = list(range(len(X)))
        random.shuffle(index)
        self.X = X.iloc[index]
        self.y = y.iloc[index]
        return self.X, self.y

    # Function to choose an action given a state and a model
    def choose_action(self, state, model):
        q_values = model.predict(state)[0]
        action = np.argmax(q_values)
        return action

    # Function to update the model weights based on observed state, action, reward, and next state
    def update_model(self, state, action, label, model, gamma):
        # Calculate the predicted Q-values for the current state
        q_values = model.predict(state)[0]

        # Calculate the target Q-values using the Bellman equation
        next_q_values = model.predict(label)[0]
        target = gamma * np.max(next_q_values)
        q_target = np.copy(q_values)
        q_target[action] = target

        # Train the model on the current state and target Q-values
        model.train_on_batch(state, np.array([q_target]))
