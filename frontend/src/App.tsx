import { useState, useEffect, useRef } from 'react';
import { Leaderboard } from './components/Leaderboard';
import { ChallengeModal } from './components/ChallengeModal';
import { Connect4Board } from './components/Connect4Board';

function App() {
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem('sessionId'));
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const [waitingPlayers, setWaitingPlayers] = useState<{id: string, name: string}[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<{challenger_id: string, challenger_name: string} | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize or restore session
  useEffect(() => {
    if (sessionId) {
      // Try to re-register to get name and setup properly
      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, name: localStorage.getItem('name') || 'Player' })
      })
      .then(res => res.json())
      .then(data => {
        setSessionId(data.session_id);
        setName(data.name);
        connectWs(data.session_id);
      })
      .catch(console.error);
    }
  }, []);

  const connectWs = (id: string) => {
    if (wsRef.current) wsRef.current.close();
    
    // Determine ws url based on current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${id}`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'state_update') {
        setWaitingPlayers(data.waiting_players);
      } else if (data.type === 'challenge_received') {
        setIncomingChallenge({
          challenger_id: data.challenger_id,
          challenger_name: data.challenger_name
        });
      } else if (data.type === 'challenge_declined') {
        alert(`${data.target_name} declined your challenge.`);
      } else if (data.type === 'game_started' || data.type === 'game_update') {
        setGameState(data.state);
        setIncomingChallenge(null);
      } else if (data.type === 'opponent_disconnected') {
        alert("Your opponent has disconnected. You've been returned to the lobby.");
        setGameState(null);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      // Optional: attempt reconnect
    };

    setWs(socket);
    wsRef.current = socket;
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setErrorMsg("Please enter a name");
      return;
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      setSessionId(data.session_id);
      localStorage.setItem('sessionId', data.session_id);
      localStorage.setItem('name', data.name);
      connectWs(data.session_id);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to join. Is the server running?");
    }
  };

  const handleChallenge = (targetId: string) => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'challenge_player', target_id: targetId }));
    }
  };

  const acceptChallenge = () => {
    if (ws && incomingChallenge) {
      ws.send(JSON.stringify({ type: 'accept_challenge', challenger_id: incomingChallenge.challenger_id }));
      setIncomingChallenge(null);
    }
  };

  const declineChallenge = () => {
    if (ws && incomingChallenge) {
      ws.send(JSON.stringify({ type: 'decline_challenge', challenger_id: incomingChallenge.challenger_id }));
      setIncomingChallenge(null);
    }
  };

  const handleMakeMove = (col: number) => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'make_move', col }));
    }
  };

  const handleLeaveGame = () => {
    setGameState(null);
    // Since game state is null, we return to lobby.
    // The backend automatically puts us back in waiting pool.
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <h1 className="text-4xl font-extrabold text-blue-600 mb-2">Connect 4</h1>
          <p className="text-gray-500 mb-6">Multiplayer Network Game</p>
          
          <input 
            type="text" 
            placeholder="Enter your name..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full border-2 border-gray-300 p-3 rounded-lg mb-4 text-lg focus:outline-none focus:border-blue-500"
          />
          {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
          <button 
            onClick={handleJoin}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Start Playing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-900">
      <header className="bg-blue-600 text-white p-4 rounded-lg shadow-md mb-6 flex justify-between items-center max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Connect 4</h1>
        <div className="flex items-center gap-4">
          <span>Playing as: <strong>{name}</strong></span>
          <button 
            onClick={() => {
              localStorage.removeItem('sessionId');
              localStorage.removeItem('name');
              setSessionId(null);
              if (ws) ws.close();
            }}
            className="bg-blue-800 px-3 py-1 rounded text-sm hover:bg-blue-900 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {incomingChallenge && (
          <ChallengeModal 
            challengerName={incomingChallenge.challenger_name}
            onAccept={acceptChallenge}
            onDecline={declineChallenge}
          />
        )}

        {gameState ? (
          <Connect4Board 
            gameState={gameState} 
            currentSessionId={sessionId} 
            onMakeMove={handleMakeMove}
            onLeaveGame={handleLeaveGame}
          />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-white p-4 rounded-lg shadow-md h-fit">
              <h2 className="text-xl font-bold mb-4">Lobby</h2>
              <p className="text-gray-600 mb-4">Players waiting to play:</p>
              {waitingPlayers.length <= 1 ? (
                <p className="text-sm italic text-gray-400">No other players online right now.</p>
              ) : (
                <ul className="space-y-2">
                  {waitingPlayers.map(p => p.id !== sessionId && (
                    <li key={p.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                      <span className="font-semibold">{p.name}</span>
                      <button 
                        onClick={() => handleChallenge(p.id)}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition"
                      >
                        Challenge
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="md:col-span-2">
              <Leaderboard 
                currentSessionId={sessionId} 
                onChallenge={handleChallenge} 
                waitingPlayers={waitingPlayers}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
