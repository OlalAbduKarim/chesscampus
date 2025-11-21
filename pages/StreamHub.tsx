import React, { useState, useEffect, useRef } from 'react';
import { Heart, Share2, MessageSquare, X, Send, Users as UsersIcon, MoreHorizontal, Gift, Smile } from 'lucide-react';
import { Streamer, ChatMessage } from '../types';
import { db, rtdb } from '../services/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ref, onValue, push, limitToLast, query as rtdbQuery } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

// --- MOCK DATA FALLBACK ---
const MOCK_STREAMS: Streamer[] = [
  { id: '1', name: 'GM Hikaru', title: 'Speedrun to 3000! 🚀', viewers: 15420, avatar: 'https://picsum.photos/seed/hikaru/50', thumbnail: 'https://picsum.photos/seed/stream1/400/225', tags: ['Blitz', 'Educational'], isLive: true },
  { id: '2', name: 'BotezLive', title: 'Subscriber Battles & Music', viewers: 8500, avatar: 'https://picsum.photos/seed/botez/50', thumbnail: 'https://picsum.photos/seed/stream2/400/225', tags: ['Fun', 'Music'], isLive: true },
  { id: '3', name: 'GothamChess', title: 'Reviewing YOUR Games', viewers: 12300, avatar: 'https://picsum.photos/seed/gotham/50', thumbnail: 'https://picsum.photos/seed/stream3/400/225', tags: ['Analysis', 'Review'], isLive: true }
];

// --- SUB-COMPONENTS ---

const StreamCard: React.FC<{ stream: Streamer; onClick: (s: Streamer) => void }> = ({ stream, onClick }) => {
  return (
    <div 
      onClick={() => onClick(stream)}
      className="group bg-dark-surface rounded-xl overflow-hidden border border-dark-border hover:border-brand-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-900/20 cursor-pointer hover:-translate-y-1 flex flex-col h-full"
    >
      <div className="relative aspect-video">
        <img src={stream.thumbnail} alt={stream.title} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center shadow-md z-10">
          <div className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></div>
          LIVE
        </div>
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1 z-10">
          <UsersIcon className="w-3 h-3" />
          {stream.viewers.toLocaleString()}
        </div>
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
        
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
           <div className="w-12 h-12 bg-brand-600/90 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm scale-75 group-hover:scale-100 transition-transform">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1"></div>
           </div>
        </div>
      </div>
      
      <div className="p-3 flex gap-3 flex-1">
        <div className="relative flex-shrink-0">
            <img src={stream.avatar} alt={stream.name} className="w-10 h-10 rounded-full border-2 border-dark-border group-hover:border-brand-500 transition-colors object-cover" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-dark-surface rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-slate-100 font-semibold text-sm truncate group-hover:text-brand-400 transition-colors leading-tight mb-1">{stream.title}</h3>
          <p className="text-slate-400 text-xs hover:underline">{stream.name}</p>
          <div className="mt-2 flex gap-1 flex-wrap">
            {stream.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-dark-bg text-slate-500 text-[10px] rounded border border-dark-border uppercase tracking-wide font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveChat: React.FC<{ stream: Streamer }> = ({ stream }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        // Listen to Realtime DB for chat messages
        const chatRef = rtdbQuery(ref(rtdb, `liveChat/${stream.id}/messages`), limitToLast(50));
        
        const unsubscribe = onValue(chatRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const parsedMessages = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                setMessages(parsedMessages);
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, [stream.id]);

    // Auto scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;
        
        if (!currentUser) {
            alert("Please login to chat!");
            return;
        }

        const chatRef = ref(rtdb, `liveChat/${stream.id}/messages`);
        await push(chatRef, {
            uid: currentUser.uid,
            user: currentUser.displayName,
            text: input,
            timestamp: Date.now(),
            userAvatar: currentUser.photoURL
        });
        
        setInput("");
    };

    return (
        <div className="flex flex-col h-full bg-dark-surface border-l border-dark-border">
            <div className="p-4 border-b border-dark-border flex justify-between items-center bg-dark-surface shadow-sm z-10">
                <div className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-brand-400" /> 
                    Stream Chat
                </div>
                <button className="text-slate-400 hover:text-white transition-colors" title="Viewers">
                    <UsersIcon className="w-4 h-4" />
                </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-sans scroll-smooth">
                {messages.length === 0 && (
                   <div className="text-center text-slate-500 text-sm mt-4">Welcome to the chat!</div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="flex items-baseline gap-2">
                            <span className={`font-bold text-xs ${msg.uid === currentUser?.uid ? 'text-brand-400' : 'text-indigo-400'} cursor-pointer hover:underline flex-shrink-0`}>
                                {msg.user}:
                            </span>
                            <span className="text-slate-300 text-sm break-words leading-snug">
                                {msg.text}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-dark-border bg-dark-surface">
                <form onSubmit={handleSend} className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={currentUser ? "Send a message..." : "Login to chat"}
                        disabled={!currentUser}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg py-2.5 pl-3 pr-10 text-sm text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                    />
                    <button type="submit" disabled={!currentUser} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-400 transition-colors p-1 disabled:opacity-50">
                        <Send className="w-4 h-4" />
                    </button>
                </form>
                <div className="flex justify-between mt-2 px-1">
                    <div className="flex gap-2 text-slate-500">
                         <button className="hover:text-brand-400 transition-colors"><Smile className="w-5 h-5" /></button>
                         <button className="hover:text-pink-500 transition-colors"><Gift className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StreamPlayerModal: React.FC<{ stream: Streamer; onClose: () => void }> = ({ stream, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full h-full md:h-[90vh] md:w-[95vw] max-w-[1800px] bg-dark-bg md:rounded-xl overflow-hidden flex flex-col md:flex-row border border-dark-border shadow-2xl relative">
            
            {/* Close Button Mobile */}
            <button 
                onClick={onClose}
                className="md:hidden absolute top-2 right-2 z-30 p-2 bg-black/50 text-white rounded-full backdrop-blur-sm"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative group bg-black">
                {/* Video Placeholder */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                    <img src={stream.thumbnail} className="w-full h-full object-cover opacity-60 blur-sm absolute inset-0" alt="Background" />
                    <img src={stream.thumbnail} className="w-full h-full object-contain relative z-10 shadow-2xl" alt="Stream" />
                    
                    {/* Overlay UI */}
                    <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-3">
                             <img src={stream.avatar} className="w-10 h-10 rounded-full border-2 border-brand-500 shadow-lg" alt="Avatar" />
                             <div>
                                 <h2 className="text-white font-bold text-lg shadow-black drop-shadow-lg">{stream.title}</h2>
                                 <p className="text-brand-400 font-medium text-sm flex items-center gap-2">
                                     {stream.name} 
                                     <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE
                                     </span>
                                 </p>
                             </div>
                        </div>
                        <button onClick={onClose} className="hidden md:block p-2 hover:bg-white/20 rounded-full text-white transition-colors">
                             <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Bottom Controls Placeholder */}
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-between items-center">
                         <div className="flex items-center gap-4 text-white">
                             <button className="hover:text-brand-400 transition-colors"><Heart className="w-6 h-6" /></button>
                             <button className="hover:text-brand-400 transition-colors"><Share2 className="w-6 h-6" /></button>
                             <button className="hover:text-white text-slate-300 transition-colors"><MoreHorizontal className="w-6 h-6" /></button>
                         </div>
                         <div className="text-slate-300 text-sm font-mono">
                             <span className="text-red-500 font-bold">●</span> {stream.viewers.toLocaleString()} Viewers
                         </div>
                    </div>
                </div>
            </div>

            {/* Chat Sidebar */}
            <div className="w-full md:w-[350px] lg:w-[400px] h-[40vh] md:h-full flex-shrink-0 relative z-20">
                <LiveChat stream={stream} />
            </div>
          </div>
        </div>
    );
};

// --- MAIN PAGE ---

const StreamHub: React.FC = () => {
  const [selectedStream, setSelectedStream] = useState<Streamer | null>(null);
  const [streams, setStreams] = useState<Streamer[]>([]);
  
  useEffect(() => {
      // Realtime Firestore listener for active streams
      const q = query(collection(db, "streams"), where("isLive", "==", true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedStreams: Streamer[] = [];
          snapshot.forEach((doc) => {
              fetchedStreams.push({ id: doc.id, ...doc.data() } as Streamer);
          });
          
          // Fallback to mock data if DB is empty (for demo purposes)
          if (fetchedStreams.length === 0) {
              setStreams(MOCK_STREAMS);
          } else {
              setStreams(fetchedStreams);
          }
      }, (error) => {
          console.error("Error fetching streams:", error);
          setStreams(MOCK_STREAMS); // Fallback on error
      });

      return () => unsubscribe();
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-dark-bg">
      {/* Header */}
      <div className="p-6 md:px-8 md:py-6 border-b border-dark-border bg-dark-surface/50 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
         <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Stream Hub</h1>
                <p className="text-slate-400 text-sm mt-1">Watch top Grandmasters and personalities live.</p>
             </div>
             <div className="hidden sm:flex gap-2">
                 <button className="px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-500 transition-colors shadow-lg shadow-brand-900/20">
                    Following
                 </button>
                 <button className="px-3 py-1.5 bg-dark-bg border border-dark-border text-slate-300 text-sm font-medium rounded-lg hover:text-white hover:border-slate-500 transition-colors">
                    Browse
                 </button>
             </div>
         </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {streams.map(stream => (
                <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    onClick={setSelectedStream} 
                />
            ))}
         </div>
         
         <div className="mt-12 mb-8 border-t border-dark-border pt-8">
            <h3 className="text-xl font-bold text-white mb-4">Recommended Categories</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {['Blitz', 'Rapid', 'Bullet', 'Instructional', 'Tournament', 'Casual'].map(cat => (
                    <div key={cat} className="flex-shrink-0 w-40 h-24 bg-dark-surface border border-dark-border rounded-lg flex items-center justify-center hover:border-brand-500 hover:bg-brand-900/10 cursor-pointer transition-all group">
                        <span className="font-bold text-slate-400 group-hover:text-brand-400 transition-colors">{cat}</span>
                    </div>
                ))}
            </div>
         </div>
      </div>

      {/* Stream Player Modal */}
      {selectedStream && (
          <StreamPlayerModal 
            stream={selectedStream} 
            onClose={() => setSelectedStream(null)} 
          />
      )}
    </div>
  );
};

export default StreamHub;