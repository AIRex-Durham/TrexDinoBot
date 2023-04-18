import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
import pickle
import os
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelBinarizer


class TrainQRL:

    def __init__(self):
        self.websocket = None

        self.data_space = []
        self.action_space = []
        self.feedback_space = []
        self.csv_data = []

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
            if len(self.csv_data) > 0:
                self.csv_data.pop()

            self.dump_data()

            await self.train_model(self.load_dumped_data())
            if self.websocket is None:
                print("Websocket object is null")
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
                                    "{:.2f}".format(float(message_json['data']["game_speed"]))])
            self.action_space.append(message_json['data']["action"])

            self.csv_data.append({
                "distance_to_obstacle": int(message_json['data']["distance_to_obstacle"]),
                "obstacle_width": int(message_json['data']["obstacle_width"]),
                "obstacle_height": int(message_json['data']["obstacle_height"]),
                "game_speed": "{:.2f}".format(float(message_json['data']["game_speed"])),
                "action": message_json['data']["action"]
            })

            await self.websocket.send_message({"msg": "Data stashed for training"})

    async def train_model(self, data):
        # Separate features (X) and labels (y)
        X = data.iloc[:, :-1]  # first five columns contain features
        y = data.iloc[:, -1]  # last column contains labels

        # split the data into training and testing sets
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # apply SMOTE to oversample the minority class in the training set
        sm = SMOTE(random_state=42)
        X_train_res, y_train_res = sm.fit_resample(X_train, y_train)

        # scale the features
        scaler = StandardScaler()
        X_train_res = scaler.fit_transform(X_train_res)
        X_test = scaler.transform(X_test)

        # one-hot encode the actions
        lb = LabelBinarizer()
        y_train_res = lb.fit_transform(y_train_res)
        y_test = lb.transform(y_test)

        # train a random forest classifier on the oversampled training set
        clf = RandomForestClassifier(random_state=42)
        clf.fit(X_train_res, y_train_res)

        # evaluate the model
        y_pred = clf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Accuracy: {accuracy}")

        with open('model.pkl', 'wb') as file:
            pickle.dump(clf, file)
