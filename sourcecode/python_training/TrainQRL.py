import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
import pickle
import os
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelBinarizer


class TrainQRL:

    def __init__(self):
        self.websocket = None
        # Define hyperparameters
        self.learning_rate = 0.8
        self.discount_factor = 0.95
        self.exploration_rate = 0.1

        # Define Q-table with states as rows and actions as columns
        self.num_states = 4
        self.num_actions = 2
        self.data_space = []
        self.action_space = []
        self.feedback_space = []
        self.csv_data = []
        self.Q_table = np.zeros((4, 1))

    def get_state(self, state):
        if state == "playing":
            return 0
        elif state == "crashed":
            return 1
        else:
            raise ValueError("Invalid state: {}".format(state))

    # Define the reward function
    def get_reward(self, action, play_state):
        if action == 0 and play_state == "crashed":
            return -10  # agent collided with obstacle
        elif action == 1 and play_state == "crashed":
            return -1  # agent failed to avoid obstacle
        elif action == 1 and play_state == "playing":
            return 10  # agent collected a point
        else:
            return 0  # no reward

    def dump_data(self):
        # Check if CSV file exists
        if os.path.isfile('data.csv'):
            # Load existing data from CSV
            df = pd.read_csv('data.csv')
        else:
            # Create new DataFrame if CSV file does not exist
            df = pd.DataFrame(
                columns=['distance_to_obstacle', 'obstacle_width', 'obstacle_height', 'game_speed', 'action'])

        # Append new data to DataFrame
        df = df.append(self.csv_data, ignore_index=True)

        # Save DataFrame to CSV file
        df.to_csv('data.csv', index=False)
        df.fillna(0, inplace=True)
        self.csv_data = []

    def load_dumped_data(self):
        if os.path.isfile('data.csv'):
            # Load existing data from CSV
            return pd.read_csv('data.csv')

    # distance_to_obstacle, obstacle_width,obstacle_height, game_speed,action,play_state(playing,crashed)
    async def handle_message(self, message_json):
        if message_json['state'] == 'crashed':
            # self.data_space.append({
            #     "distance_to_obstacle": self.data_space[-1]["distance_to_obstacle"],
            #     "obstacle_width": self.data_space[-1]["obstacle_width"],
            #     "obstacle_height": self.data_space[-1]["obstacle_height"],
            #     "game_speed": self.data_space[-1]["game_speed"],
            # })
            # self.action_space.append(self.action_space[-1])
            # self.feedback_space[-1] = self.get_state('crashed')

            if len(self.data_space) > 0:
                self.data_space.pop()
            if len(self.action_space) > 0:
                self.action_space.pop()
            if len(self.feedback_space) > 0:
                self.feedback_space.pop()
            if len(self.csv_data) > 0:
                self.csv_data.pop()

            self.dump_data()

            await self.train_model(self.load_dumped_data())
            if self.websocket is None:
                print("Websocket object is null")
            await self.websocket.send_message({"msg": "Training Complete"})
        elif message_json['state'] == 'playing':
            # Step 2: Define the state space and action space
            # Define the same state and action space as in the RL agent approach
            # self.data_space.append({
            #     "distance_to_obstacle": int(message_json['data']["distance_to_obstacle"]),
            #     "obstacle_width": int(message_json['data']["obstacle_width"]),
            #     "obstacle_height": int(message_json['data']["obstacle_height"]),
            #     "game_speed": float(message_json['data']["game_speed"]),
            # })
            # self.action_space.append(message_json['data']["action"])
            # self.feedback_space.append(message_json['data']["state"])

            self.data_space.append([int(message_json['data']["distance_to_obstacle"]),
                                    int(message_json['data']["obstacle_width"]),
                                    int(message_json['data']["obstacle_height"]),
                                    float(message_json['data']["game_speed"])])
            self.action_space.append(message_json['data']["action"])
            self.feedback_space.append(message_json['data']["state"])

            self.csv_data.append({
                "distance_to_obstacle": int(message_json['data']["distance_to_obstacle"]),
                "obstacle_width": int(message_json['data']["obstacle_width"]),
                "obstacle_height": int(message_json['data']["obstacle_height"]),
                "game_speed": float(message_json['data']["game_speed"]),
                "action": message_json['data']["action"]
            })

            await self.websocket.send_message({"msg": "Data stashed for training"})

    def get_state_tuple(self, index):
        return hash((
            self.data_space[index]["distance_to_obstacle"],
            self.data_space[index]["obstacle_width"],
            self.data_space[index]["obstacle_height"],
            self.data_space[index]["game_speed"]
        ))

    async def train_model(self, data):
        # Separate features (X) and labels (y)
        X = data.iloc[:, :-1]  # first five columns contain features
        y = data.iloc[:, -1]  # last column contains labels

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Apply SMOTE to oversample the minority class in the training set
        sm = SMOTE(random_state=42)
        X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
        print(y_train_res.value_counts())

        # Train a machine learning model on the oversampled training set
        clf = RandomForestClassifier(random_state=42)
        clf.fit(X_train_res, y_train_res)

        with open('model.pkl', 'wb') as file:
            pickle.dump(clf, file)
