
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from 'lucide-react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { rtdb } from '../services/firebase';
import { ref, onValue, set } from 'firebase/database';

const SESSION_ID = "demo-session-123"; // In real app, this comes from URL param

const PrivateLesson: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  useEffect(() => {
    // Sync Board State
    const boardRef = ref(rtdb, `lessons/${SESSION_ID}/fen`);
    
    const unsubscribe = onValue(boardRef, (snapshot) => {
        const fen = snapshot.val();
        if (fen) {
            // Only update if different to prevent loops
            const currentFen = game.fen();
            if (fen !== currentFen) {
                setGame(new Chess(fen));
            }
        }
    });

    return () => unsubscribe();
  }, []);

  function onDrop(sourceSquare: string, targetSquare: string) {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      
      if (result) {
        setGame(gameCopy);
        // Push new FEN to Realtime DB
        set(ref(rtdb, `lessons/${SESSION_ID}/fen`), gameCopy.fen());
        return true;
      }
    } catch (e) { return false; }
    return false;
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto pb-20 lg:pb-4">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Private Lesson</h2>
          <p className="text-slate-400 text-sm">Coach IM Alex • 1h 30m remaining</p>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-red-500 animate-pulse text-xs font-bold px-2 py-1 bg-red-900/20 rounded border border-red-900">REC</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Board Area */}
        <div className="flex-1 bg-dark-surface rounded-2xl shadow-inner border border-dark-border flex items-center justify-center p-4 min-h-[400px]">
             <div className="h-full max-h-[600px] aspect-square">
                <Chessboard 
                    position={game.fen()} 
                    onPieceDrop={onDrop}
                    customBoardStyle={{
                        borderRadius: '8px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                    customDarkSquareStyle={{ backgroundColor: '#475569' }}
                    customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
             </div>
        </div>

        {/* Right Column: Video & Chat */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
            
            {/* Video Feed - Coach */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg border border-dark-border">
                <img src="https://picsum.photos/seed/coach/600/400" className="w-full h-full object-cover opacity-90" />
                <div className="absolute bottom-2 left-2 text-white text-sm font-medium shadow-black drop-shadow-md">IM Alex (Coach)</div>
            </div>

            {/* Video Feed - Self */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg border border-dark-border">
                {camOn ? (
                    <img src="https://picsum.photos/seed/student/600/400" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">Camera Off</div>
                )}
                <div className="absolute bottom-2 left-2 text-white text-sm font-medium">You</div>
                
                {/* Controls */}
                <div className="absolute bottom-2 right-2 flex gap-2">
                    <button onClick={() => setMicOn(!micOn)} className={`p-1.5 rounded-full ${!micOn ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'} backdrop-blur-md transition-colors`}>
                        {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setCamOn(!camOn)} className={`p-1.5 rounded-full ${!camOn ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'} backdrop-blur-md transition-colors`}>
                        {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Call Actions */}
            <div className="flex justify-center py-4">
                <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all">
                    <PhoneOff className="w-5 h-5" /> End Lesson
                </button>
            </div>

            {/* Quick Notes / Chat */}
            <div className="flex-1 bg-dark-surface rounded-xl border border-dark-border flex flex-col overflow-hidden">
                <div className="p-3 border-b border-dark-border text-sm font-bold text-slate-300">Lesson Notes</div>
                <div className="flex-1 p-3 text-sm text-slate-400 overflow-y-auto space-y-2 font-mono">
                    <p className="text-brand-400">{'>'} Watch out for the knight fork on e5.</p>
                    <p className="text-brand-400">{'>'} Control the open c-file.</p>
                    <p className="text-slate-500 italic">Alex highlighted sq d4.</p>
                </div>
                <div className="p-2 border-t border-dark-border">
                    <input type="text" placeholder="Type a note..." className="w-full bg-dark-bg text-white text-sm rounded px-2 py-1 border border-dark-border focus:border-brand-500 outline-none" />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default PrivateLesson;
