import numpy as np
import cv2
import base64
from keras import layers, models
from keras.models import load_model
import os


class TrainViaCNN:

    def create_file(self, filename):
        try:
            # Try to open the file in read mode
            with open(filename, "r") as file:
                print(f"{filename} already exists")
        except FileNotFoundError:
            # If the file does not exist, create it in write mode
            with open(filename, "x") as file:
                print(f"{filename} has been created")

    def __init__(self):
        self.model_file = 'trex_model.h5'
        self.image_dataset = []
        self.label_dataset = []
        # self.create_file('labels.npy')
        # self.create_file('screenshots.npy')

        if os.path.isfile(self.model_file):
            # load the existing model
            self.model = load_model(self.model_file)
        else:
            # define the CNN model architecture
            self.model = models.Sequential()
            self.model.add(layers.Conv2D(32, (3, 3), activation='relu', input_shape=(80, 80, 1)))
            self.model.add(layers.MaxPooling2D((2, 2)))
            self.model.add(layers.Conv2D(64, (3, 3), activation='relu'))
            self.model.add(layers.MaxPooling2D((2, 2)))
            self.model.add(layers.Conv2D(64, (3, 3), activation='relu'))
            self.model.add(layers.Flatten())
            self.model.add(layers.Dense(64, activation='relu'))
            self.model.add(layers.Dense(1, activation='sigmoid'))

            # compile the model
            self.model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

    def create_image_dataset(self, base64_data):
        # decode the base64 data and convert it to a NumPy array
        decoded_data = base64.b64decode(base64_data)
        np_data = np.frombuffer(decoded_data, dtype=np.uint8)

        # decode the image from the NumPy array
        img = cv2.imdecode(np_data, cv2.IMREAD_GRAYSCALE)

        # resize the image to 80x80 pixels
        resized = cv2.resize(img, (80, 80), interpolation=cv2.INTER_AREA)
        # normalize the pixel values to be between 0 and 1
        normalized = resized.astype('float') / 255.0
        # add a channel dimension to the image
        return np.expand_dims(normalized, axis=-1)

    def save_image_in_dataset(self):
        if not os.path.exists('screenshots.npy'):
            np.save('screenshots.npy', [])

        # load the existing dataset file
        with open('screenshots.npy', 'rb') as f:
            dataset = np.load(f)
            if len(dataset) == 0:
                dataset = np.empty_like(self.image_dataset)

        # append the new image array to the dataset
        self.image_dataset = np.concatenate((dataset, self.image_dataset), axis=0)

        # save the updated dataset file
        with open('screenshots.npy', 'wb') as f:
            np.save(f, self.image_dataset)

    async def handle_message(self, message_json):
        if message_json['state'] == 'crashed':
            self.image_dataset.pop()
            self.label_dataset.pop()
            self.save_image_in_dataset()
            self.save_label()
            self.train_model()
        elif message_json['state'] == 'playing_base64image':
            self.image_dataset.append(self.create_image_dataset(message_json["data"]["image"]))
            self.label_dataset.append(message_json["data"]["action"])

    def train_model(self):
        print("train model")
        # load and preprocess the training data
        X_train = np.array(self.image_dataset)
        y_train = np.array(self.label_dataset)
        self.model.fit(X_train, y_train, epochs=10, batch_size=32)

        # save the model for future use
        self.model.save('t-rex-bot.h5')

    def save_label(self):

        if not os.path.exists('labels.npy'):
            np.save('labels.npy', [])

        # read the existing labels from the file
        existing_labels = np.load('labels.npy')

        if len(existing_labels) == 0:
            existing_labels = np.empty_like(self.label_dataset)

        # concatenate the existing and new labels
        self.label_dataset = np.append(existing_labels, self.label_dataset)

        # save the concatenated labels to the file
        np.save('labels.npy', self.label_dataset)

    async def predict(self, message_json):
        image_data = message_json["data"]["image"]
        image_np = np.frombuffer(image_data, dtype=np.uint8)
        image = cv2.imdecode(image_np, cv2.IMREAD_GRAYSCALE)

        # preprocess the image for the model
        image_resized = cv2.resize(image, (80, 80), interpolation=cv2.INTER_AREA)
        image_4d = np.expand_dims(image_resized, axis=0)
        image_4d = np.expand_dims(image_4d, axis=3)

        # make the prediction
        prediction = self.model.predict(image_4d)[0]

        # determine the next jump based on the prediction
        if prediction[0] > prediction[1]:
            next_jump = 0  # no jump
        else:
            next_jump = 1  # jump
            await self.websocket.send_message({"labels": "Jump"})

        print("Next jump:", next_jump)
