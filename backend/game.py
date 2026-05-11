import random

class Game:
    def __init__(self, player1_id: str, player2_id: str):
        self.game_id = f"{player1_id}-{player2_id}"
        self.players = [player1_id, player2_id]
        
        # Randomly assign who goes first
        random.shuffle(self.players)
        
        # Board is 6 rows by 7 cols. 0 = empty, 1 = player1 (first), 2 = player2 (second)
        self.board = [[0 for _ in range(7)] for _ in range(6)]
        self.current_turn_index = 0 # 0 for players[0], 1 for players[1]
        self.status = "playing" # "playing", "won", "draw"
        self.winner = None

    def get_state(self):
        return {
            "game_id": self.game_id,
            "players": self.players,
            "board": self.board,
            "current_turn": self.players[self.current_turn_index],
            "status": self.status,
            "winner": self.winner
        }

    def make_move(self, player_id: str, col: int) -> bool:
        if self.status != "playing":
            return False
        
        if player_id != self.players[self.current_turn_index]:
            return False
            
        if col < 0 or col > 6:
            return False

        # Find lowest empty row in the column
        row_to_place = -1
        for r in range(5, -1, -1):
            if self.board[r][col] == 0:
                row_to_place = r
                break
                
        if row_to_place == -1:
            return False # Column full
            
        player_num = self.current_turn_index + 1
        self.board[row_to_place][col] = player_num
        
        if self.check_win(row_to_place, col, player_num):
            self.status = "won"
            self.winner = player_id
        elif self.check_draw():
            self.status = "draw"
        else:
            self.current_turn_index = 1 - self.current_turn_index
            
        return True

    def check_draw(self):
        # If top row is full, it's a draw
        for c in range(7):
            if self.board[0][c] == 0:
                return False
        return True

    def check_win(self, r: int, c: int, p: int):
        directions = [
            [(0, 1), (0, -1)],  # Horizontal
            [(1, 0), (-1, 0)],  # Vertical
            [(1, 1), (-1, -1)], # Diagonal /
            [(1, -1), (-1, 1)]  # Diagonal \
        ]
        
        for dir_pair in directions:
            count = 1
            for dr, dc in dir_pair:
                nr, nc = r + dr, c + dc
                while 0 <= nr < 6 and 0 <= nc < 7 and self.board[nr][nc] == p:
                    count += 1
                    nr += dr
                    nc += dc
            if count >= 4:
                return True
        return False
