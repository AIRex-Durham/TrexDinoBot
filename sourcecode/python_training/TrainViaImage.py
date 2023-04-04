import cv2
import numpy as np
from keras.models import Sequential
from keras.layers import Dense, Flatten
import base64
from keras.utils import to_categorical

from keras.models import load_model


class TrainViaImage:
    # Define the state space dimensions
    state_dim = (300, 150)
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
        height, width = img.shape
        img = img[:, :width // 2]

        # Resize the image to the state space dimensions
        img = cv2.resize(img, self.state_dim)

        print(img.shape)  # Debugging statement

        # Convert the image to a state representation (i.e., a numpy array)
        state = img.reshape((self.state_dim[0], self.state_dim[1], 1))

        return state

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
        height, width = img.shape
        img = img[:, :width // 2]

        # Resize the image to the state space dimensions
        img = cv2.resize(img, self.state_dim)

        print(img.shape)  # Debugging statement

        # Convert the image to a state representation (i.e., a numpy array)
        state = img.reshape((self.state_dim[0], self.state_dim[1], 1))

        return state

    # distance_to_obstacle, obstacle_width,obstacle_height, game_speed,action,play_state(playing,crashed)
    async def handle_message(self, message_json):
        if message_json['state'] == 'crashed':
            if len(self.base64Images) > 0:
                self.base64Images.pop()
                await self.train_model()

            if self.websocket is None:
                print("Websocket object is null")
        elif message_json['state'] == 'playing_base64image':
            self.base64Images.append(message_json["data"]["image"])
            self.input_actions.append(message_json["data"]["action"])

    def get_base64_image(self, index):
        return self.base64Images[index]

    async def train_model(self):
        if self.base64Images < 2:
            return
        # Define the training data
        X_train = []
        y_train = []

        # Train the neural network using the user's inputs
        for index in range(len(self.base64Images)):
            base64_image = self.get_base64_image(index)
            action = self.input_actions[index]
            state = self.get_user_input(base64_image)
            X_train.append(state)
            y_train.append(action)
        X_train = np.array(X_train)
        y_train = np.array(y_train)
        y_train = to_categorical(y_train)
        self.model.fit(X_train, y_train, epochs=self.num_epochs)
        self.model.save('trex_image_model.h5')

    async def predict(self, message_json):
        loaded_model = load_model('trex_image_model.h5')
        base64_image = message_json["data"]["image"]
        state = self.get_user_input_predict(base64_image)
        state = np.reshape(state, (1, 300, 150))
        action_probs = loaded_model.predict(state)
        if action_probs.any() > 0.5:
            await self.websocket.send_message({"labels": "Jump"})
        else:
            await self.websocket.send_message({"labels": "Do_Nothing"})
