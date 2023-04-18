#!/usr/bin/env python

import asyncio
import json

from websockets import serve
import websockets
from websockets.extensions import permessage_deflate

from Train import Train
from TrainQRL import TrainQRL
from Predict import Predict
from TrainViaImage import TrainViaImage
from TrainViaCNN import TrainViaCNN


class Websocket:
    def __init__(self):
        self.websocket = None
        self.train = None
        self.predict = None
        self.trainViaImage = None
        self.trainViaCNN = None

    async def start_socket(self):
        async with serve(self.handler, "localhost", 8765):
            print("Server started")
            await asyncio.Future()  # Run forever

    async def send_message(self, message):
        await self.websocket.send(json.dumps(message))

    async def handler(self, websocket):

        self.websocket = websocket
        async for message in websocket:
            await self.handle_message(message)

    async def handle_message(self, message):
        message_json = json.loads(message)
        if message_json['state'] == 'predict':
            if self.predict is None:
                self.predict = Predict()
                self.predict.websocket = self
            prediction = await self.predict.predict_action(message_json)
            message_json["action"] = prediction
            await self.train.handle_message(message_json)

        elif message_json['state'] == 'predict_base64Image':
            if self.trainViaCNN is None:
                self.trainViaCNN = TrainViaCNN()
                self.trainViaCNN.websocket = self
            # Run predict_action() as a background task using asyncio.create_task()
            asyncio.create_task(self.trainViaCNN.predict(message_json))

            # if self.trainViaImage is None:
            #     self.trainViaImage = TrainViaImage()
            #     self.trainViaImage.websocket = self
            # # Run predict_action() as a background task using asyncio.create_task()
            # asyncio.create_task(self.trainViaImage.predict(message_json))

        elif message_json['state'] == 'playing_base64image':
            # if self.trainViaImage is None:
            #     self.trainViaImage = TrainViaImage()
            #     self.trainViaImage.websocket = self
            # await self.trainViaImage.handle_message(message_json)

            if self.trainViaCNN is None:
                self.trainViaCNN = TrainViaCNN()
                self.trainViaCNN.websocket = self
            await self.trainViaCNN.handle_message(message_json)
        elif message_json['state'] == 'crashed':
            if not (self.trainViaCNN is None):
                await self.trainViaCNN.handle_message(message_json)

            if not (self.trainViaImage is None):
                await self.trainViaImage.handle_message(message_json)
            if not (self.train is None):
                await self.train.handle_message(message_json)
        else:
            if self.train is None:
                self.train = TrainQRL()
                self.train.websocket = self
            await self.train.handle_message(message_json)


websocketObj = Websocket()
asyncio.run(websocketObj.start_socket())
