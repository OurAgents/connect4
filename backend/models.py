from sqlalchemy import Column, Integer, String, Float
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # session_id or uuid
    name = Column(String, index=True)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    draws = Column(Integer, default=0)
    win_loss_ratio = Column(Float, default=0.0)

    def update_ratio(self):
        total_games = self.wins + self.losses
        if total_games == 0:
            self.win_loss_ratio = 0.0
        else:
            self.win_loss_ratio = self.wins / total_games
