import tensorflow as tf
import numpy as np
import pandas as pd
import pickle


class Predict:
    def __init__(self):
        self.websocket = None

    def predict_action(self, data):
        # Load trained model from disk
        model = pickle.load(open("trained", 'rb'))

        # Convert input data to DataFrame
        X_pred = pd.DataFrame([[data['distance_to_obstacle'],
                                data['obstacle_width'],
                                data['obstacle_height'],
                                data['game_speed']
                                ]])

        # Use the model to make predictions for the input data
        y_pred = model.predict(X_pred)

        # Return the predicted labels
        self.websocket.send_message({"labels": [np.argmax(x) for x in y_pred]})
