
const STOCKFISH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

export interface EngineEvaluation {
    type: 'cp' | 'mate';
    value: number;
}

class StockfishService {
    private worker: Worker | null = null;
    private isReady: boolean = false;

    async init() {
        if (this.worker) return;

        try {
            // Create a local worker script that imports the engine.
            // This bypasses strict CORS on Worker constructors by running same-origin code first.
            const workerScript = `
                try {
                    importScripts('${STOCKFISH_URL}');
                } catch (e) {
                    self.postMessage('error:import_failed');
                }
            `;
            
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);

            this.worker = new Worker(blobUrl);
            
            this.worker.onmessage = (e) => {
                if (e.data === 'readyok') {
                    this.isReady = true;
                } else if (e.data === 'error:import_failed') {
                    console.error("Stockfish failed to load in worker.");
                }
            };

            this.worker.onerror = (err) => {
                console.error("Stockfish Worker Error:", err);
            };

            this.worker.postMessage('uci');
        } catch (e) {
            console.error("Failed to initialize Stockfish:", e);
        }
    }

    calculateBestMove(
        fen: string, 
        level: number, 
        onMove: (move: string) => void,
        onEvaluation?: (evalData: EngineEvaluation) => void
    ) {
        if (!this.worker) {
            this.init().then(() => {
                if(this.worker) this.calculateBestMove(fen, level, onMove, onEvaluation);
            });
            return;
        }

        const skill = Math.min(20, Math.max(0, level));
        
        this.worker.postMessage(`setoption name Skill Level value ${skill}`);
        this.worker.postMessage(`position fen ${fen}`);
        
        const depth = skill < 5 ? 5 : skill < 15 ? 12 : 18;
        const moveTime = skill < 5 ? 500 : skill < 15 ? 1000 : 2000;

        this.worker.postMessage(`go depth ${depth} movetime ${moveTime}`);

        const listener = (e: MessageEvent) => {
            const line = e.data;
            if (typeof line !== 'string') return;

            // Parse Evaluation
            if (line.startsWith('info') && onEvaluation && line.includes('score')) {
                const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                if (scoreMatch) {
                    const type = scoreMatch[1] as 'cp' | 'mate';
                    const value = parseInt(scoreMatch[2], 10);
                    onEvaluation({ type, value });
                }
            }

            // Parse Best Move
            if (line.startsWith('bestmove')) {
                const parts = line.split(' ');
                const move = parts[1];
                
                this.worker?.removeEventListener('message', listener);
                
                if (move && move !== '(none)') {
                    onMove(move);
                }
            }
        };

        this.worker.addEventListener('message', listener);
    }

    stop() {
        this.worker?.postMessage('stop');
    }

    terminate() {
        this.worker?.terminate();
        this.worker = null;
        this.isReady = false;
    }
}

export const stockfish = new StockfishService();