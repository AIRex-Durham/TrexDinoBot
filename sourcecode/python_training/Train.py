import tensorflow as tf
import numpy as np
import pandas as pd
import random
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import pickle



class Train:
    def __init__(self):
        self.websocket = None
        self.X = None
        self.Y = None
        self.y = None
        self.websocket = None
        self.state_space = pd.DataFrame()
        self.num_episodes = 1000
        self.gamma = 0.95

    async def handle_message(self, message_json):
        if message_json['state'] == 'end':
            self.state_space.loc[self.state_space.index[-1], 'state'] = 'CRASHED'
            await self.start_training()
            if self.websocket is None:
                print("Websocket object is null")
            await self.websocket.send_message({"msg": "Training Complete"})
        elif message_json['state'] == 'playing':
            # Step 2: Define the state space and action space
            # Define the same state and action space as in the RL agent approach
            self.state_space = self.state_space.add(message_json['data'])
            self.state_space.loc[self.state_space.index[-1], 'state'] = 'PLAYING'
            await self.websocket.send_message({"msg": "Data stashed for training"})

    async def start_training(self):
        # Split the data into training and testing sets
        X = self.state_space.drop('action', axis=1)
        print(self.state_space)
        y = self.state_space['action']
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Create the random forest classifier model
        model = RandomForestClassifier(n_estimators=100, random_state=42)

        # Train the model
        model.fit(X_train, y_train)

        pickle.dump(model, open("trained", 'wb'))

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
