import cv2
import numpy as np
from keras.models import Sequential
from keras.layers import Dense, Flatten
import base64
from keras.utils import to_categorical

from keras.models import load_model
import time
import calendar


class TrainViaImage:
    # Define the state space dimensions
    state_dim = (250, 150)
    num_epochs = 10
    websocket = None

    # Define the action space dimensions
    action_dim = 2

    # Define the neural network architecture
    model = Sequential()
    model.add(Flatten(input_shape=state_dim))
    model.add(Dense(128, activation='relu'))
    model.add(Dense(64, activation='relu'))
    model.add(Dense(action_dim, activation='softmax'))
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    base64Images = []
    input_actions = []

    # Capture the screen image of the T-Rex game and get the user's input
    def get_user_input(self, base64_image):
        # Pad the base64-encoded image string if needed
        while len(base64_image) % 4 != 0:
            base64_image += "="

        # Convert the base64-encoded image to a numpy array
        img_bytes = base64.b64decode(base64_image)
        np_img = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_GRAYSCALE)

        # Crop the image in half
        # height, width = img.shape
        # img = img[:, 114:((width // 2)+114)]

        # Resize the image to the state space dimensions
        img = cv2.resize(img, self.state_dim)

        # Get obstacle information from the image
        distance_to_obstacle, obstacle_width, obstacle_height, y, predicted_img = self.get_obstacle_info(img)

        # print(img.shape)  # Debugging statement

        # Convert the image to a state representation (i.e., a numpy array)
        state = img.reshape((self.state_dim[0], self.state_dim[1], 1))

        # Create a feature vector that includes obstacle information
        features = np.array([distance_to_obstacle, obstacle_width, obstacle_height, y, predicted_img])

        # print("distance_to_obstacle: "+str(distance_to_obstacle))
        # print("obstacle_width: "+str(obstacle_width))
        # print("obstacle_height: "+str(obstacle_height))

        # Return the state and feature vector as inputs to the model
        return state, features

        # Capture the screen image of the T-Rex game and get the user's input
    def get_user_input_predict(self, base64_image):
        # Pad the base64-encoded image string if needed
        while len(base64_image) % 4 != 0:
            base64_image += "="

        # Convert the base64-encoded image to a numpy array
        img_bytes = base64.b64decode(base64_image)
        np_img = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_GRAYSCALE)

        # Crop the image in half
        # height, width = img.shape
        # img = img[:, 114:(width // 2) + 114]

        # Resize the image to the state space dimensions
        img = cv2.resize(img, self.state_dim)

        # Get obstacle information from the image
        distance_to_obstacle, obstacle_width, obstacle_height, y, predicted_img = self.get_obstacle_info(img)

        # print(img.shape)  # Debugging statement

        # Convert the image to a state representation (i.e., a numpy array)
        state = img.reshape((self.state_dim[0], self.state_dim[1], 1))

        # Create a feature vector that includes obstacle information
        features = np.array([distance_to_obstacle, obstacle_width, obstacle_height, y, predicted_img])

        # print("distance_to_obstacle: " + str(distance_to_obstacle))
        # print("obstacle_width: " + str(obstacle_width))
        # print("obstacle_height: " + str(obstacle_height))

        # Return the state and feature vector as inputs to the model
        return state, features

    # distance_to_obstacle, obstacle_width,obstacle_height, game_speed,action,play_state(playing,crashed)
    async def handle_message(self, message_json):
        if message_json['state'] == 'crashed':
            if len(self.base64Images) > 0:
                self.base64Images.pop()
                self.input_actions.pop()
                await self.train_model()

            if self.websocket is None:
                print("Websocket object is null")
        elif message_json['state'] == 'playing_base64image':
            self.base64Images.append(message_json["data"]["image"])
            self.input_actions.append(message_json["data"]["action"])

    def get_base64_image(self, index):
        return self.base64Images[index]

    async def train_model(self):
        if len(self.base64Images) < 2:
            return
        # Define the training data
        X_train = []
        y_train = []

        # Train the neural network using the user's inputs
        for index in range(len(self.base64Images)):
            base64_image = self.get_base64_image(index)
            action = self.input_actions[index]
            state, features = self.get_user_input(base64_image, action)

            state_shape = state.shape
            features_shape = features.shape

            # print(features)
            #
            # if len(features_shape) == 1:
            #     # Reshape features to have the same number of dimensions as state
            #     features = np.reshape(features, (1,) + (1,) * (len(state_shape) - 1) + features_shape)
            #
            # X_train.append(np.concatenate((state, features), axis=2))
            X_train.append(state)

            y_train.append(action)


        X_train = np.array(X_train)
        y_train = np.array(y_train)
        y_train = to_categorical(y_train)
        self.model.fit(X_train, y_train, epochs=self.num_epochs)
        self.model.save('trex_image_model.h5')

    async def predict(self, message_json):
        # print(self.get_timestamp())
        # loaded_model = load_model('trex_image_model.h5')
        # print("model loaded")
        # print(self.get_timestamp())
        base64_image = message_json["data"]["image"]

        state, features = self.get_user_input(base64_image)

        if features[0] <= 60 and features[0] > 1:
            print("jump")
            await self.websocket.send_message({"labels": "Jump"})
        else:
            print("distance:"+str(features[0]))

        # state = np.reshape(state, (1, 300, 150))
        # action_probs = loaded_model.predict(state)
        # if action_probs.any() > 0.5:
        #     await self.websocket.send_message({"labels": "Jump"})
        # else:
        #     await self.websocket.send_message({"labels": "Do_Nothing"})

    def get_obstacle_info(self, img):
        # Crop the image in half
        # height, width = img.shape

        # Detect edges in the image
        edges = cv2.Canny(img, 10, 250)

        # Find contours in the image
        contours, hierarchy = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Filter out small contours and get the largest remaining contour
        contours = [contour for contour in contours if cv2.contourArea(contour) > 50]

        if len(contours) == 0:
            print("no contour")
            return 0, 0, 0, 0, 0

        # contour = max(contours, key=cv2.contourArea)
        contour = contours[0] if len(contours) > 0 else None

        # Get the bounding rectangle for the contour
        x, y, w, h = cv2.boundingRect(contour)

        # print("x: " + str(x) + " y:" + str(y) + " w:" + str(w) + " h:" + str(h))

        left = x
        right = x + w
        top = y
        bottom = y + h

        # Draw a rectangle around the obstacle
        cv2.rectangle(img, (left, top), (right, bottom), (0, 0, 255), 5)

        # Save the image with the obstacle box
        cv2.imwrite('predict/obstacle_detected'+self.get_timestamp()+'.png', img)

        # Get obstacle information
        obstacle_distance = x
        obstacle_width = right
        obstacle_height = h

        return obstacle_distance, obstacle_width, obstacle_height, y, img



    def get_timestamp(self):
        current_GMT = time.gmtime()

        time_stamp = calendar.timegm(current_GMT)
        return str(time_stamp)