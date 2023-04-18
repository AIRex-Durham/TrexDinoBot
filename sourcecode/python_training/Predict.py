import os

import numpy as np
import pickle
import pandas as pd


class Predict:
    def __init__(self):
        self.websocket = None
        self.csv_data = []

    async def append_data(self, message_json, prediction):

        predicted = None
        # Return the predicted labels
        if prediction:
            predicted = "Jump"
        else:
            predicted = "Do_Nothing"

        self.csv_data.append({
            "distance_to_obstacle": int(message_json['data']["distance_to_obstacle"]),
            "obstacle_width": int(message_json['data']["obstacle_width"]),
            "obstacle_height": int(message_json['data']["obstacle_height"]),
            "game_speed": "{:.2f}".format(float(message_json['data']["game_speed"])),
            "prediction": predicted,
        })

        # Check if CSV file exists
        if os.path.isfile('predict.csv'):
            # Load existing data from CSV
            df = pd.read_csv('predict.csv')
        else:
            # Create new DataFrame if CSV file does not exist
            df = pd.DataFrame(
                columns=['distance_to_obstacle', 'obstacle_width', 'obstacle_height', 'game_speed', 'prediction'])

        # Append new data to DataFrame
        df = df.append(self.csv_data, ignore_index=True)

        # Save DataFrame to CSV file
        df.to_csv('predict.csv', index=False)
        df.fillna(0, inplace=True)
        self.csv_data = []

    async def predict_action(self, message_json):

        # Load saved model from disk
        with open('model.pkl', 'rb') as file:
            clf = pickle.load(file)

        # Make predictions with loaded model
        prediction = clf.predict([[int(message_json['data']["distance_to_obstacle"]),
                                   int(message_json['data']["obstacle_width"]),
                                   int(message_json['data']["obstacle_height"]),
                                   "{:.2f}".format(float(message_json['data']["game_speed"]))]])

        print("prediction: " + str(prediction[0]))

        await self.append_data(message_json, prediction[0])

        # Return the predicted labels
        if prediction[0]:
            await self.websocket.send_message({"labels": "Jump"})
        else:
            await self.websocket.send_message({"labels": "Do_Nothing"})

        return prediction[0]
