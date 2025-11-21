
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
            // Using importScripts in a Blob allows loading the worker file from a different origin
            // correctly while maintaining the worker context.
            // Important: Do not overwrite self.onmessage here, as Stockfish.js sets up its own listener.
            const workerScript = `
                importScripts('${STOCKFISH_URL}');
            `;
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            
            this.worker.onmessage = (e) => {
                if (e.data === 'readyok') {
                    this.isReady = true;
                }
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
                // If initialization succeeded, try again. 
                // If not, we can't do anything.
                if(this.worker) this.calculateBestMove(fen, level, onMove, onEvaluation);
            });
            return;
        }

        const skill = Math.min(20, Math.max(0, level));
        
        // Configure
        this.worker.postMessage(`setoption name Skill Level value ${skill}`);
        this.worker.postMessage(`position fen ${fen}`);
        
        // Time management
        const depth = skill < 5 ? 5 : skill < 15 ? 12 : 18;
        const moveTime = skill < 5 ? 500 : skill < 15 ? 1000 : 2000;

        this.worker.postMessage(`go depth ${depth} movetime ${moveTime}`);

        // Cleanup safety
        let timeoutId: any;

        const listener = (e: MessageEvent) => {
            const line = e.data;
            if (typeof line !== 'string') return;

            // Eval
            if (line.startsWith('info') && onEvaluation && line.includes('score')) {
                const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
                if (scoreMatch) {
                    const type = scoreMatch[1] as 'cp' | 'mate';
                    const value = parseInt(scoreMatch[2], 10);
                    onEvaluation({ type, value });
                }
            }

            // Best Move
            if (line.startsWith('bestmove')) {
                const parts = line.split(' ');
                const move = parts[1];
                
                this.worker?.removeEventListener('message', listener);
                clearTimeout(timeoutId);
                
                if (move && move !== '(none)') {
                    onMove(move);
                } else {
                    // Fallback if engine returns nothing/none (e.g. mate)
                }
            }
        };

        this.worker.addEventListener('message', listener);

        // Safety timeout to prevent hanging if engine crashes
        timeoutId = setTimeout(() => {
            this.worker?.removeEventListener('message', listener);
            // console.warn("Stockfish timeout");
        }, moveTime + 2000);
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
