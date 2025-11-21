
import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { 
    RotateCcw, Lightbulb, BrainCircuit, Swords, Trophy, 
    AlertTriangle, Play, Clock, Flag, Undo, Activity, User
} from 'lucide-react';
import { analyzeBoardPosition } from '../services/geminiService';
import { stockfish, EngineEvaluation } from '../services/stockfish';

// --- TYPES ---

type GameMode = 'Easy' | 'Medium' | 'Hard' | 'Master' | 'Custom';
type TimeControl = 'Blitz' | 'Rapid' | 'Classical' | 'Unlimited';
type PlayerColor = 'w' | 'b' | 'random';

interface GameSettings {
    mode: GameMode;
    difficulty: number; // 0-20
    timeControl: TimeControl;
    playerColor: PlayerColor;
}

const PRESETS: Record<GameMode, number> = {
    'Easy': 2,
    'Medium': 8,
    'Hard': 14,
    'Master': 20,
    'Custom': 10
};

const TIME_CONTROLS: Record<TimeControl, number | null> = {
    'Blitz': 3 * 60,
    'Rapid': 10 * 60,
    'Classical': 30 * 60,
    'Unlimited': null
};

// --- HELPER COMPONENTS ---

const Timer: React.FC<{ time: number | null; isActive: boolean; label: string }> = ({ time, isActive, label }) => {
    if (time === null) return <div className="text-xs font-mono text-slate-500 uppercase px-2">{label}</div>;
    
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${isActive ? 'bg-brand-900/20 border-brand-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]' : 'bg-dark-bg border-dark-border'}`}>
            <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-brand-400 animate-pulse' : 'text-slate-500'}`} />
            <span className={`font-mono font-bold text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {formatTime(time)}
            </span>
        </div>
    );
};

const EvaluationBar: React.FC<{ evaluation: EngineEvaluation | null; isPlayerWhite: boolean }> = ({ evaluation, isPlayerWhite }) => {
    if (!evaluation) return null;

    const whiteValue = evaluation.value;
    const userValue = isPlayerWhite ? whiteValue : -whiteValue;
    
    let text = "";
    let colorClass = "text-slate-400";

    if (evaluation.type === 'mate') {
        const mateIn = Math.abs(whiteValue);
        const isGoodForUser = (whiteValue > 0) === isPlayerWhite;
        text = `M${mateIn}`;
        colorClass = isGoodForUser ? "text-green-400" : "text-red-400";
    } else {
        const score = (userValue / 100).toFixed(1);
        const sign = userValue > 0 ? '+' : '';
        text = `${sign}${score}`;
        colorClass = userValue > 0 ? "text-green-400" : userValue < 0 ? "text-red-400" : "text-slate-400";
    }

    return (
        <div className="flex items-center gap-1.5 text-xs font-mono bg-dark-bg px-2 py-1 rounded border border-dark-border">
            <Activity className="w-3 h-3 text-slate-500" />
            <span className={colorClass}>{text}</span>
        </div>
    );
};

// --- MAIN COMPONENT ---

const PlayArea: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<string>('Not Started');
  const [isGameActive, setIsGameActive] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<GameSettings>({
      mode: 'Medium',
      difficulty: 8,
      timeControl: 'Unlimited',
      playerColor: 'w'
  });
  const [actualPlayerColor, setActualPlayerColor] = useState<'w' | 'b'>('w');

  // Engine
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null); 
  
  // Analysis
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Timers
  const [whiteTime, setWhiteTime] = useState<number | null>(null);
  const [blackTime, setBlackTime] = useState<number | null>(null);

  useEffect(() => {
    stockfish.init();
    return () => stockfish.terminate();
  }, []);

  // Timer
  useEffect(() => {
      if (!isGameActive || game.isGameOver() || settings.timeControl === 'Unlimited') return;

      const timer = setInterval(() => {
          setWhiteTime(wt => {
              if (game.turn() === 'w' && wt !== null && wt > 0) return wt - 1;
              return wt;
          });
          setBlackTime(bt => {
              if (game.turn() === 'b' && bt !== null && bt > 0) return bt - 1;
              return bt;
          });
      }, 1000);

      if ((whiteTime !== null && whiteTime <= 0) || (blackTime !== null && blackTime <= 0)) {
          setIsGameActive(false);
          setGameStatus(whiteTime === 0 ? "Time's up! Black wins." : "Time's up! White wins.");
          clearInterval(timer);
      }

      return () => clearInterval(timer);
  }, [isGameActive, game.turn(), settings.timeControl, whiteTime, blackTime]);

  // Check game status
  useEffect(() => {
      if (game.isCheckmate()) {
          setGameStatus(game.turn() === actualPlayerColor ? "Checkmate! You lost." : "Checkmate! You won!");
          setIsGameActive(false);
      } else if (game.isDraw()) {
          setGameStatus("Draw");
          setIsGameActive(false);
      } else if (game.isCheck()) {
          setGameStatus("Check!");
      } else if (isGameActive) {
          setGameStatus(game.turn() === actualPlayerColor ? "Your Turn" : "Stockfish Thinking...");
      }
  }, [game, isGameActive, actualPlayerColor]);

  // Engine Move Trigger
  useEffect(() => {
      if (isGameActive && !game.isGameOver() && game.turn() !== actualPlayerColor && !isEngineThinking) {
          makeEngineMove();
      }
  }, [game, isGameActive, actualPlayerColor]);

  const startGame = () => {
      const newGame = new Chess();
      setGame(newGame);
      setHistory([]);
      setAiAdvice(null);
      setEvaluation(null);
      
      let pColor: 'w' | 'b' = 'w';
      if (settings.playerColor === 'random') {
          pColor = Math.random() < 0.5 ? 'w' : 'b';
      } else {
          pColor = settings.playerColor as 'w' | 'b';
      }
      setActualPlayerColor(pColor);

      const initialTime = TIME_CONTROLS[settings.timeControl];
      setWhiteTime(initialTime);
      setBlackTime(initialTime);

      setIsGameActive(true);
      setGameStatus("Game Started");
  };

  const resetGame = () => {
      setIsGameActive(false);
      setGame(new Chess());
      setHistory([]);
      setGameStatus("New Game");
      setEvaluation(null);
      setAiAdvice(null);
      stockfish.stop();
      setIsEngineThinking(false);
  };

  const onDrop = (source: string, target: string) => {
      if (!isGameActive || game.turn() !== actualPlayerColor || isEngineThinking) return false;

      const gameCopy = new Chess(game.fen());
      let move = null;
      try {
          move = gameCopy.move({
              from: source,
              to: target,
              promotion: 'q',
          });
      } catch (e) { return false; }

      if (!move) return false;

      setGame(gameCopy);
      setHistory(prev => [...prev, move.san]);
      setAiAdvice(null);
      return true;
  };

  const makeEngineMove = () => {
      setIsEngineThinking(true);
      const currentTurn = game.turn(); 
      const currentFen = game.fen(); 

      stockfish.calculateBestMove(
          currentFen,
          settings.difficulty,
          (bestMove) => {
              const from = bestMove.substring(0, 2);
              const to = bestMove.substring(2, 4);
              const promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : undefined;
              
              setGame((prev) => {
                  const gameCopy = new Chess(prev.fen());
                  try {
                      const move = gameCopy.move({ from, to, promotion: promotion || 'q' });
                      if (move) {
                          setHistory(h => [...h, move.san]);
                          return gameCopy;
                      }
                  } catch(e) {}
                  return prev;
              });
              
              setIsEngineThinking(false);
          },
          (evalData) => {
              const multiplier = currentTurn === 'w' ? 1 : -1;
              setEvaluation({
                  type: evalData.type,
                  value: evalData.value * multiplier
              });
          }
      );
  };

  const handleUndo = () => {
      if (!isGameActive || isEngineThinking || history.length < 2) return;
      setGame(g => {
          const copy = new Chess(g.fen());
          copy.undo(); // Engine
          copy.undo(); // Player
          return copy;
      });
      setHistory(prev => prev.slice(0, -2));
  };

  const handleResign = () => {
      setIsGameActive(false);
      setGameStatus("You resigned. Stockfish wins.");
  };

  const handleAnalysis = async () => {
      setIsAnalyzing(true);
      setAiAdvice("Grandmaster Coach is analyzing...");
      const advice = await analyzeBoardPosition(game.fen(), history);
      setAiAdvice(advice);
      setIsAnalyzing(false);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-dark-bg">
      {/* LEFT: BOARD AREA */}
      <div className="flex-1 flex flex-col relative overflow-y-auto lg:overflow-hidden">
          
          {/* Mobile Status & Timers */}
          <div className="lg:hidden p-3 bg-dark-surface border-b border-dark-border flex justify-between items-center sticky top-0 z-20 shadow-md">
              <span className="font-bold text-sm text-white truncate max-w-[40%]">{gameStatus}</span>
              {isGameActive && (
                <div className="flex gap-2">
                    <Timer time={actualPlayerColor === 'w' ? whiteTime : blackTime} isActive={game.turn() === actualPlayerColor} label="YOU" />
                    <Timer time={actualPlayerColor === 'w' ? blackTime : whiteTime} isActive={game.turn() !== actualPlayerColor} label="CPU" />
                </div>
              )}
          </div>

          <div className="flex-1 bg-dark-bg flex flex-col items-center p-4 relative">
            <div className="w-full md:max-w-[70vh] lg:max-w-[65vh] flex flex-col gap-3">
                
                {/* CPU Info (Desktop) */}
                <div className="hidden lg:flex justify-between items-end px-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600 shadow-sm">
                            <BrainCircuit className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-300 text-sm">Stockfish {settings.mode}</div>
                            <div className="text-[10px] text-slate-500 font-mono">Level {settings.difficulty}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <EvaluationBar evaluation={evaluation} isPlayerWhite={actualPlayerColor === 'w'} />
                        {isGameActive && <Timer time={actualPlayerColor === 'w' ? blackTime : whiteTime} isActive={game.turn() !== actualPlayerColor} label="CPU" />}
                    </div>
                </div>

                {/* BOARD */}
                <div className="w-full aspect-square shadow-2xl shadow-black rounded-lg overflow-hidden border-4 border-dark-surface relative group">
                    <Chessboard 
                        position={game.fen()} 
                        onPieceDrop={onDrop}
                        boardOrientation={actualPlayerColor === 'w' ? 'white' : 'black'}
                        arePiecesDraggable={isGameActive && !isEngineThinking && game.turn() === actualPlayerColor}
                        customDarkSquareStyle={{ backgroundColor: '#334155' }} 
                        customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                        animationDuration={200}
                    />
                    
                    {isEngineThinking && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 animate-in fade-in">
                            <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></div>
                            <span className="text-[10px] text-white font-bold tracking-wide">THINKING</span>
                        </div>
                    )}

                    {game.isGameOver() && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-20 flex items-center justify-center animate-in fade-in">
                            <div className="bg-dark-surface p-6 rounded-xl border border-dark-border shadow-2xl text-center">
                                <Trophy className="w-12 h-12 text-brand-400 mx-auto mb-3" />
                                <h2 className="text-xl font-bold text-white mb-1">{gameStatus}</h2>
                                <button onClick={startGame} className="mt-4 px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-bold text-sm">Play Again</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Player Info (Desktop) */}
                <div className="hidden lg:flex justify-between items-start px-1">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center border border-brand-500 shadow-lg">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="font-bold text-white text-sm">You</div>
                            <div className="text-[10px] text-brand-400 font-mono">{actualPlayerColor === 'w' ? 'White' : 'Black'}</div>
                        </div>
                    </div>
                    {isGameActive && <Timer time={actualPlayerColor === 'w' ? whiteTime : blackTime} isActive={game.turn() === actualPlayerColor} label="YOU" />}
                </div>
            </div>
          </div>
      </div>

      {/* RIGHT: CONTROLS & ANALYSIS */}
      <div className="w-full lg:w-[380px] bg-dark-surface border-t lg:border-t-0 lg:border-l border-dark-border flex flex-col h-auto lg:h-full z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:shadow-none">
          <div className="p-4 md:p-5 border-b border-dark-border flex items-center gap-2 font-bold text-white">
              <Swords className="w-5 h-5 text-brand-500" />
              {isGameActive ? "Match Info" : "Game Setup"}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar max-h-[40vh] lg:max-h-none">
              {isGameActive ? (
                  <div className="space-y-6">
                      {/* Status Box (Hidden Mobile - shown in top bar) */}
                      <div className="hidden lg:block bg-dark-bg rounded-xl p-4 border border-dark-border">
                          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status</div>
                          <div className="text-lg font-bold text-white">{gameStatus}</div>
                          {game.inCheck() && !game.isGameOver() && (
                              <div className="text-red-400 text-xs font-bold mt-1 flex items-center gap-1 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" /> Check!
                              </div>
                          )}
                      </div>

                      {/* AI Coach */}
                      <div className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border relative group ${aiAdvice ? 'border-brand-500' : 'border-dark-border'}`}>
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-brand-300 font-bold text-sm flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" /> GM Coach
                              </span>
                              <button onClick={handleAnalysis} disabled={isAnalyzing} className="text-xs bg-brand-600/20 text-brand-300 px-3 py-1 rounded-full hover:bg-brand-600 hover:text-white transition-colors">
                                  {isAnalyzing ? 'Thinking...' : 'Ask Advice'}
                              </button>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed min-h-[3em]">
                              {aiAdvice || "Stuck? I can analyze this position for you."}
                          </p>
                      </div>

                      {/* Move History */}
                      <div className="bg-dark-bg rounded-xl border border-dark-border overflow-hidden flex flex-col h-32 md:h-48">
                           <div className="px-3 py-2 bg-dark-surface/50 border-b border-dark-border text-xs font-bold text-slate-500 uppercase">Move History</div>
                           <div className="flex-1 overflow-y-auto p-2 font-mono text-sm">
                               <div className="grid grid-cols-[30px_1fr_1fr] gap-y-1">
                                   {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                                       <React.Fragment key={i}>
                                           <div className="text-slate-600 text-center py-1">{i+1}.</div>
                                           <div className="bg-white/5 text-slate-200 px-2 py-1 rounded">{history[i*2]}</div>
                                           <div className="bg-white/5 text-slate-200 px-2 py-1 rounded">{history[i*2+1]||''}</div>
                                       </React.Fragment>
                                   ))}
                               </div>
                           </div>
                      </div>
                      
                      {/* Game Actions */}
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={handleUndo} className="p-3 bg-dark-bg hover:bg-dark-border border border-dark-border rounded-lg text-slate-300 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                              <Undo className="w-4 h-4" /> Takeback
                          </button>
                          <button onClick={handleResign} className="p-3 bg-dark-bg hover:border-red-500/50 border border-dark-border rounded-lg text-red-400 hover:text-red-300 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                              <Flag className="w-4 h-4" /> Resign
                          </button>
                      </div>
                      <button onClick={resetGame} className="w-full p-3 mt-2 text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2">
                          <RotateCcw className="w-4 h-4" /> New Game Setup
                      </button>
                  </div>
              ) : (
                  /* SETUP SCREEN */
                  <div className="space-y-8">
                      {/* Difficulty */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Difficulty</label>
                          <div className="grid grid-cols-2 gap-2">
                              {Object.keys(PRESETS).filter(k => k !== 'Custom').map((mode) => (
                                  <button 
                                    key={mode}
                                    onClick={() => setSettings(s => ({ ...s, mode: mode as GameMode, difficulty: PRESETS[mode as GameMode] }))}
                                    className={`p-3 rounded-lg border text-left transition-all ${settings.mode === mode ? 'bg-brand-600 border-brand-500 text-white shadow-md' : 'bg-dark-bg border-dark-border text-slate-400 hover:border-slate-600'}`}
                                  >
                                      <div className="font-bold text-sm">{mode}</div>
                                      <div className={`text-[10px] ${settings.mode === mode ? 'text-brand-200' : 'text-slate-600'}`}>Level {PRESETS[mode as GameMode]}</div>
                                  </button>
                              ))}
                          </div>
                          <div className="mt-4 p-4 bg-dark-bg border border-dark-border rounded-lg">
                              <div className="flex justify-between mb-2 text-xs font-bold text-slate-400">
                                  <span>Custom Strength</span>
                                  <span className="text-brand-400">{settings.difficulty}</span>
                              </div>
                              <input 
                                type="range" min="0" max="20" 
                                value={settings.difficulty} 
                                onChange={(e) => setSettings(s => ({ ...s, mode: 'Custom', difficulty: parseInt(e.target.value) }))}
                                className="w-full h-2 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-brand-500"
                              />
                          </div>
                      </div>

                      {/* Time Control */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Time Control</label>
                          <div className="grid grid-cols-2 gap-2">
                              {Object.keys(TIME_CONTROLS).map((tc) => (
                                  <button 
                                    key={tc}
                                    onClick={() => setSettings(s => ({ ...s, timeControl: tc as TimeControl }))}
                                    className={`py-2 px-3 rounded-lg border text-sm font-bold transition-all ${settings.timeControl === tc ? 'bg-brand-900/30 border-brand-500 text-brand-400' : 'bg-dark-bg border-dark-border text-slate-400'}`}
                                  >
                                      {tc}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Play As */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Play As</label>
                          <div className="flex bg-dark-bg p-1 rounded-lg border border-dark-border">
                               <button onClick={() => setSettings(s => ({ ...s, playerColor: 'w' }))} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${settings.playerColor === 'w' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}>White</button>
                               <button onClick={() => setSettings(s => ({ ...s, playerColor: 'random' }))} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${settings.playerColor === 'random' ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Random</button>
                               <button onClick={() => setSettings(s => ({ ...s, playerColor: 'b' }))} className={`flex-1 py-2 rounded text-sm font-bold transition-all ${settings.playerColor === 'b' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Black</button>
                          </div>
                      </div>

                      <button 
                        onClick={startGame}
                        className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95 mb-8"
                      >
                          <Play className="w-5 h-5 fill-current" /> Start Match
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default PlayArea;
