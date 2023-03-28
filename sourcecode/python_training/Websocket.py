#!/usr/bin/env python

import asyncio
from websockets import serve

from sourcecode.python_training.Train import Train


class Websocket:
    def __init__(self):
        self.websocket = None
        self.train = Train(self)

    async def start_socket(self):
        print("start_socket")
        async with serve(self.handler, "localhost", 8765):
            await asyncio.Future()  # Run forever

    async def send_message(self, message):
        await self.websocket.send(message)

    async def handler(self, websocket):
        print("handler")
        self.websocket = websocket
        async for message in websocket:
            await self.handle_message(message)

    async def handle_message(self, message):
        # await self.train.handle_message(message)
        pass


websocketObj = Websocket()
asyncio.run(websocketObj.start_socket())
