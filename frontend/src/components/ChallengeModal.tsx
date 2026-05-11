
interface Props {
  challengerName: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function ChallengeModal({ challengerName, onAccept, onDecline }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <h2 className="text-2xl font-bold mb-4">Challenge!</h2>
        <p className="mb-6"><span className="font-semibold text-blue-600">{challengerName}</span> has challenged you to a game.</p>
        <div className="flex justify-center gap-4">
          <button 
            onClick={onAccept}
            className="bg-green-500 text-white px-4 py-2 rounded font-bold hover:bg-green-600 transition"
          >
            Accept
          </button>
          <button 
            onClick={onDecline}
            className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-red-600 transition"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
