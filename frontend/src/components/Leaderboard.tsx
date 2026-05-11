import { useEffect, useState } from 'react';

export interface LeaderboardEntry {
  name: string;
  wins: number;
  losses: number;
  ratio: number;
  id: string;
}

interface Props {
  currentSessionId: string;
  onChallenge: (targetId: string) => void;
  waitingPlayers: {id: string, name: string}[];
}

export function Leaderboard({ currentSessionId, onChallenge, waitingPlayers }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // Poll every 5 seconds as a simple fallback, though real-time is handled via ws state updates too
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const waitingIds = new Set(waitingPlayers.map(p => p.id));

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4">Leaderboard & Players</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">W/L Ratio</th>
              <th className="py-2 px-4">Wins</th>
              <th className="py-2 px-4">Losses</th>
              <th className="py-2 px-4">Status / Action</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map(entry => (
              <tr key={entry.id} className="border-b">
                <td className="py-2 px-4 font-semibold">{entry.name} {entry.id === currentSessionId && "(You)"}</td>
                <td className="py-2 px-4">{(entry.ratio * 100).toFixed(1)}%</td>
                <td className="py-2 px-4">{entry.wins}</td>
                <td className="py-2 px-4">{entry.losses}</td>
                <td className="py-2 px-4">
                  {entry.id !== currentSessionId && waitingIds.has(entry.id) ? (
                    <button 
                      onClick={() => onChallenge(entry.id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                    >
                      Challenge
                    </button>
                  ) : entry.id !== currentSessionId ? (
                    <span className="text-gray-500 text-sm">In Game / Offline</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
