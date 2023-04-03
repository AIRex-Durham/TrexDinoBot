#!/usr/bin/env python

import asyncio
import json

from websockets import serve

from Train import Train
from TrainQRL import TrainQRL
from Predict import Predict


class Websocket:
    def __init__(self):
        self.websocket = None
        self.train = None
        self.predict = None

    async def start_socket(self):
        print("start_socket")
        async with serve(self.handler, "localhost", 8765):
            await asyncio.Future()  # Run forever

    async def send_message(self, message):
        print("send_message")
        await self.websocket.send(json.dumps(message))

    async def handler(self, websocket):
        print("handler")
        self.websocket = websocket
        async for message in websocket:
            await self.handle_message(message)

    async def handle_message(self, message):
        message_json = json.loads(message)
        print(message_json)
        if message_json['state'] == 'predict':
            self.predict = Predict()
            self.predict.websocket = self
            await self.predict.predict_action(message_json)
        else:
            if self.train is None:
                self.train = TrainQRL()
                self.train.websocket = self
            await self.train.handle_message(message_json)


websocketObj = Websocket()
asyncio.run(websocketObj.start_socket())
