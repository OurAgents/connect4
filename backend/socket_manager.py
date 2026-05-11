import json
from fastapi import WebSocket
from game import Game

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.waiting_players: set[str] = set()
        self.active_games: dict[str, Game] = {} # maps player_id to Game
        self.challenges: dict[str, str] = {} # maps challenged_id to challenger_id

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.waiting_players.add(session_id)

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.waiting_players:
            self.waiting_players.remove(session_id)
            
        # Clean up challenges
        self.challenges = {k: v for k, v in self.challenges.items() if k != session_id and v != session_id}
        
        # If in game, maybe end it (handle disconnect as forfeit/draw)
        game = self.active_games.get(session_id)
        if game:
            other_player = game.players[0] if game.players[1] == session_id else game.players[1]
            if session_id in self.active_games: del self.active_games[session_id]
            if other_player in self.active_games: del self.active_games[other_player]
            
            # Put other player back in waiting pool if they are still connected
            if other_player in self.active_connections:
                self.waiting_players.add(other_player)
                
                # Notify the remaining player that their opponent disconnected
                import asyncio
                asyncio.create_task(
                    self.send_personal_message({"type": "opponent_disconnected"}, other_player)
                )

        return None

    async def send_personal_message(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(json.dumps(message))

    async def broadcast(self, message: dict):
        msg_str = json.dumps(message)
        for connection in self.active_connections.values():
            await connection.send_text(msg_str)
            
    def create_game(self, p1_id: str, p2_id: str) -> Game:
        game = Game(p1_id, p2_id)
        self.active_games[p1_id] = game
        self.active_games[p2_id] = game
        if p1_id in self.waiting_players: self.waiting_players.remove(p1_id)
        if p2_id in self.waiting_players: self.waiting_players.remove(p2_id)
        return game

manager = ConnectionManager()
