
interface GameState {
  game_id: string;
  players: string[]; // [p1, p2]
  board: number[][]; // 6 rows x 7 cols
  current_turn: string;
  status: string; // "playing", "won", "draw"
  winner: string | null;
  player_names: { [key: string]: string };
}

interface Props {
  gameState: GameState;
  currentSessionId: string;
  onMakeMove: (col: number) => void;
  onLeaveGame: () => void;
}

export function Connect4Board({ gameState, currentSessionId, onMakeMove, onLeaveGame }: Props) {
  const isMyTurn = gameState.current_turn === currentSessionId && gameState.status === 'playing';
  
  // Players: player 1 is blue (1), player 2 is green (2)
  const myPlayerNum = gameState.players[0] === currentSessionId ? 1 : 2;
  const oppPlayerNum = myPlayerNum === 1 ? 2 : 1;
  
  const myName = gameState.player_names[currentSessionId] || 'You';
  const oppName = gameState.player_names[gameState.players.find(id => id !== currentSessionId) || ''] || 'Opponent';

  const handleColumnClick = (colIndex: number) => {
    if (isMyTurn) {
      onMakeMove(colIndex);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-md max-w-3xl mx-auto mt-6">
      <div className="flex justify-between w-full mb-6 text-xl font-bold">
        <div className={`flex items-center gap-2 ${myPlayerNum === 1 ? 'text-blue-600' : 'text-green-500'}`}>
          <div className={`w-6 h-6 rounded-full ${myPlayerNum === 1 ? 'bg-blue-600' : 'bg-green-500'}`}></div>
          {myName}
        </div>
        <div className="text-gray-500">VS</div>
        <div className={`flex items-center gap-2 ${oppPlayerNum === 1 ? 'text-blue-600' : 'text-green-500'}`}>
          {oppName}
          <div className={`w-6 h-6 rounded-full ${oppPlayerNum === 1 ? 'bg-blue-600' : 'bg-green-500'}`}></div>
        </div>
      </div>

      <div className="mb-4 text-2xl font-bold text-center h-10">
        {gameState.status === 'playing' ? (
          isMyTurn ? (
            <span className="text-yellow-600 animate-pulse">Your Turn!</span>
          ) : (
            <span className="text-gray-500">Waiting for {oppName}...</span>
          )
        ) : gameState.status === 'won' ? (
          gameState.winner === currentSessionId ? (
            <span className="text-green-600">You Won! 🎉</span>
          ) : (
            <span className="text-red-500">{oppName} Won! 😢</span>
          )
        ) : (
          <span className="text-gray-700">It's a Draw! 🤝</span>
        )}
      </div>

      <div className="bg-yellow-400 p-3 rounded-lg shadow-inner inline-block">
        <div className="grid grid-cols-7 gap-2">
          {gameState.board.map((row, rowIndex) => (
            row.map((cell, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`} 
                className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex justify-center items-center cursor-pointer transition
                  ${cell === 0 ? 'bg-white shadow-inner' : cell === 1 ? 'bg-blue-600 shadow-md' : 'bg-green-500 shadow-md'}
                  ${isMyTurn && cell === 0 && rowIndex === 0 ? 'hover:bg-gray-100' : ''}`}
                onClick={() => handleColumnClick(colIndex)}
              >
                {cell === 1 && <span className="text-white font-bold text-2xl md:text-3xl">X</span>}
                {cell === 2 && <span className="text-white font-bold text-2xl md:text-3xl">O</span>}
              </div>
            ))
          ))}
        </div>
      </div>

      {gameState.status !== 'playing' && (
        <button 
          onClick={onLeaveGame}
          className="mt-8 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          Return to Lobby
        </button>
      )}
    </div>
  );
}
