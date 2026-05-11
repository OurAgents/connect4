from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid
import os
import json

from database import engine, Base, get_db
from models import User
from socket_manager import manager

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Allow CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
@app.post("/api/register")
def register_user(request_data: dict, db: Session = Depends(get_db)):
    name = request_data.get("name")
    session_id = request_data.get("session_id")
    
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    # If session_id is provided and user exists, return user
    if session_id:
        user = db.query(User).filter(User.id == session_id).first()
        if user:
            # Update name if it changed
            if user.name != name:
                user.name = name
                db.commit()
            return {"session_id": user.id, "name": user.name}

    # Otherwise create new user
    new_session_id = str(uuid.uuid4())
    new_user = User(id=new_session_id, name=name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"session_id": new_user.id, "name": new_user.name}

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.win_loss_ratio.desc(), User.wins.desc()).limit(50).all()
    return [{"name": u.name, "wins": u.wins, "losses": u.losses, "ratio": u.win_loss_ratio, "id": u.id} for u in users]


# WebSocket Route
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == session_id).first()
    if not user:
        await websocket.close()
        return

    await manager.connect(session_id, websocket)
    
    # Broadcast updated waiting list and leaderboard
    await broadcast_state(db)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await handle_message(session_id, message, db)
    except WebSocketDisconnect:
        manager.disconnect(session_id)
        await broadcast_state(db)


async def broadcast_state(db: Session):
    waiting_users = db.query(User).filter(User.id.in_(manager.waiting_players)).all()
    waiting_list = [{"id": u.id, "name": u.name} for u in waiting_users]
    
    await manager.broadcast({
        "type": "state_update",
        "waiting_players": waiting_list
    })

async def handle_message(session_id: str, message: dict, db: Session):
    msg_type = message.get("type")
    
    if msg_type == "challenge_player":
        target_id = message.get("target_id")
        if target_id in manager.waiting_players and target_id != session_id:
            manager.challenges[target_id] = session_id
            challenger = db.query(User).filter(User.id == session_id).first()
            await manager.send_personal_message({
                "type": "challenge_received",
                "challenger_id": session_id,
                "challenger_name": challenger.name
            }, target_id)

    elif msg_type == "accept_challenge":
        challenger_id = message.get("challenger_id")
        # Check if challenge exists and both are waiting
        if manager.challenges.get(session_id) == challenger_id:
            if challenger_id in manager.waiting_players and session_id in manager.waiting_players:
                game = manager.create_game(challenger_id, session_id)
                del manager.challenges[session_id]
                
                # Notify both players game started
                game_state = game.get_state()
                p1_name = db.query(User).filter(User.id == game.players[0]).first().name
                p2_name = db.query(User).filter(User.id == game.players[1]).first().name
                
                game_state["player_names"] = {
                    game.players[0]: p1_name,
                    game.players[1]: p2_name
                }
                
                await manager.send_personal_message({"type": "game_started", "state": game_state}, game.players[0])
                await manager.send_personal_message({"type": "game_started", "state": game_state}, game.players[1])
                await broadcast_state(db)

    elif msg_type == "decline_challenge":
        challenger_id = message.get("challenger_id")
        if manager.challenges.get(session_id) == challenger_id:
            del manager.challenges[session_id]
            target_user = db.query(User).filter(User.id == session_id).first()
            await manager.send_personal_message({
                "type": "challenge_declined",
                "target_name": target_user.name
            }, challenger_id)

    elif msg_type == "make_move":
        col = message.get("col")
        game = manager.active_games.get(session_id)
        if game and game.make_move(session_id, col):
            state = game.get_state()
            
            p1_name = db.query(User).filter(User.id == game.players[0]).first().name
            p2_name = db.query(User).filter(User.id == game.players[1]).first().name
            state["player_names"] = {game.players[0]: p1_name, game.players[1]: p2_name}

            if state["status"] in ["won", "draw"]:
                # Update stats
                u1 = db.query(User).filter(User.id == game.players[0]).first()
                u2 = db.query(User).filter(User.id == game.players[1]).first()
                
                if state["status"] == "won":
                    winner_id = state["winner"]
                    if u1.id == winner_id:
                        u1.wins += 1
                        u2.losses += 1
                    else:
                        u2.wins += 1
                        u1.losses += 1
                else: # Draw = win for both
                    u1.wins += 1
                    u1.draws += 1
                    u2.wins += 1
                    u2.draws += 1
                
                u1.update_ratio()
                u2.update_ratio()
                db.commit()
                
                # Cleanup game
                if game.players[0] in manager.active_games: del manager.active_games[game.players[0]]
                if game.players[1] in manager.active_games: del manager.active_games[game.players[1]]
                manager.waiting_players.add(game.players[0])
                manager.waiting_players.add(game.players[1])

            await manager.send_personal_message({"type": "game_update", "state": state}, game.players[0])
            await manager.send_personal_message({"type": "game_update", "state": state}, game.players[1])
            
            if state["status"] in ["won", "draw"]:
                await broadcast_state(db)

# Serve React App (Must be at the bottom)
if os.path.exists("../frontend/dist"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

