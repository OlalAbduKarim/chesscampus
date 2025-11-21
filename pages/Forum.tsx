import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Eye, Tag, Plus, ThumbsUp, 
  CornerDownRight, Search, ChevronDown, 
  MoreHorizontal, X, Send, Hash, Flame
} from 'lucide-react';
import { ForumThread, ForumCategory, ForumComment, PrivateChat, ForumUser } from '../types';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, increment, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

// --- MOCK CATEGORIES (Used for init if DB empty) ---
const MOCK_CATEGORIES: ForumCategory[] = [
  { id: 'all', name: 'All Discussions', slug: 'all', count: 142 },
  { id: 'general', name: 'General Chess', slug: 'general', count: 45 },
  { id: 'openings', name: 'Openings & Theory', slug: 'openings', count: 32 },
  { id: 'endgame', name: 'Endgame Studies', slug: 'endgame', count: 18 },
  { id: 'tournaments', name: 'Tournaments', slug: 'tournaments', count: 24 }
];

// --- UTILS ---
const timeAgo = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// --- COMPONENTS ---

const CommentNode: React.FC<{ comment: ForumComment }> = ({ comment }) => {
  const [showReply, setShowReply] = useState(false);
  const [likes, setLikes] = useState(comment.likes);

  return (
    <div className="flex gap-3 mt-4 animate-in fade-in duration-300">
      <div className="flex flex-col items-center">
        <img src={comment.authorAvatar} alt={comment.authorName} className="w-8 h-8 rounded-full border border-dark-border" />
        <div className="w-px h-full bg-dark-border mt-2"></div>
      </div>
      
      <div className="flex-1 pb-4 min-w-0">
        <div className="bg-dark-bg border border-dark-border rounded-lg p-3 hover:border-slate-600 transition-colors">
           <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                 <span className="font-bold text-sm text-slate-200 truncate">{comment.authorName}</span>
                 <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(comment.createdAt)}</span>
              </div>
           </div>
           <p className="text-slate-300 text-sm leading-relaxed break-words">{comment.content}</p>
           
           <div className="flex items-center gap-4 mt-3">
              <button 
                onClick={() => setLikes(prev => prev + 1)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-400 transition-colors"
              >
                 <ThumbsUp className="w-3 h-3" /> {likes}
              </button>
              <button 
                onClick={() => setShowReply(!showReply)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
              >
                 <MessageSquare className="w-3 h-3" /> Reply
              </button>
           </div>
        </div>

        {/* Nested Replies */}
        {comment.replies && comment.replies.map(reply => (
           <CommentNode key={reply.id} comment={reply} />
        ))}
      </div>
    </div>
  );
};

const CreateThreadModal: React.FC<{ onClose: () => void; categories: ForumCategory[] }> = ({ onClose, categories }) => {
    const { currentUser } = useAuth();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [categoryId, setCategoryId] = useState(categories[1]?.id || "general");
    const [tags, setTags] = useState("");

    const handleSubmit = async () => {
        if (!currentUser) return alert("Login required");
        if (!title || !content) return;

        try {
            await addDoc(collection(db, 'forums', categoryId, 'threads'), {
                title,
                content,
                authorId: currentUser.uid,
                authorName: currentUser.displayName,
                authorAvatar: currentUser.photoURL,
                categoryId,
                tags: tags.split(',').map(t => t.trim()),
                createdAt: Date.now(),
                lastActive: Date.now(),
                likes: 0,
                repliesCount: 0,
                views: 0
            });
            onClose();
        } catch (e) {
            console.error("Error creating thread", e);
        }
    };

    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
        <div className="bg-dark-surface border border-dark-border w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-dark-border flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Create New Thread</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-brand-500 outline-none" placeholder="e.g., Best response to 1. e4?" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-brand-500 outline-none appearance-none">
                            {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Tags (comma separated)</label>
                        <input value={tags} onChange={e => setTags(e.target.value)} type="text" className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-brand-500 outline-none" placeholder="opening, help, analysis" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Content</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-white focus:border-brand-500 outline-none h-40" placeholder="Start the discussion..."></textarea>
                </div>
            </div>
            <div className="p-4 border-t border-dark-border flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium shadow-lg shadow-brand-900/20">Create Thread</button>
            </div>
        </div>
    </div>
    );
};

// --- MAIN FORUM COMPONENT ---

const Forum: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  
  // Fetch Threads
  useEffect(() => {
    const fetchThreads = async () => {
        const threadsList: ForumThread[] = [];
        
        try {
            if (activeCategory === 'all') {
                 // Mock behavior for 'all'
                 const q = query(collection(db, 'forums', 'general', 'threads'), orderBy('createdAt', 'desc'));
                 const snap = await getDocs(q);
                 snap.forEach(doc => threadsList.push({ id: doc.id, ...doc.data() } as ForumThread));
            } else {
                 const q = query(collection(db, 'forums', activeCategory, 'threads'), orderBy('createdAt', 'desc'));
                 const snap = await getDocs(q);
                 snap.forEach(doc => threadsList.push({ id: doc.id, ...doc.data() } as ForumThread));
            }
            setThreads(threadsList);
        } catch (e) {
            console.error("Error fetching threads:", e);
        }
    };
    
    fetchThreads();
  }, [activeCategory, sortBy]);

  // Fetch Comments
  useEffect(() => {
    if (!activeThread) return;
    
    const q = query(collection(db, 'forums', activeThread.categoryId, 'threads', activeThread.id, 'replies'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedComments: ForumComment[] = [];
        snapshot.forEach(doc => fetchedComments.push({ id: doc.id, ...doc.data() } as ForumComment));
        setComments(fetchedComments);
    });
    return () => unsubscribe();
  }, [activeThread]);

  // Filter Logic
  const filteredThreads = threads.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
  }).sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      return b.likes - a.likes;
  });

  return (
    <div className="h-full flex flex-col bg-dark-bg overflow-hidden">
        {/* MOBILE CATEGORY SCROLL */}
        <div className="md:hidden w-full overflow-x-auto bg-dark-surface border-b border-dark-border px-2 py-2 scrollbar-hide">
            <div className="flex space-x-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setActiveThread(null); }}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                            ${activeCategory === cat.id 
                                ? 'bg-brand-600 text-white' 
                                : 'bg-dark-bg text-slate-400 border border-dark-border'
                            }
                        `}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* LEFT SIDEBAR - Categories (Desktop) */}
            <div className="w-64 bg-dark-surface border-r border-dark-border flex-col hidden md:flex">
                <div className="p-4 border-b border-dark-border">
                     <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Categories</h2>
                     <div className="space-y-1">
                         {categories.map(cat => (
                             <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setActiveThread(null); }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                                    ${activeCategory === cat.id 
                                        ? 'bg-brand-600/10 text-brand-400 font-medium' 
                                        : 'text-slate-400 hover:bg-dark-border hover:text-slate-200'
                                    }
                                `}
                             >
                                 <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4" />
                                    {cat.name}
                                 </div>
                                 {cat.count && <span className="text-xs bg-dark-bg px-1.5 py-0.5 rounded border border-dark-border text-slate-500">{cat.count}</span>}
                             </button>
                         ))}
                     </div>
                </div>
                
                {/* Placeholder for Private Chats */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Private Chats</h2>
                        <button className="text-slate-500 hover:text-brand-400"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="text-xs text-slate-500 italic text-center mt-4">No active chats</div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0">
                
                {/* Header */}
                <div className="h-16 border-b border-dark-border bg-dark-surface/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
                    {!activeThread ? (
                        <>
                            <div className="flex items-center gap-2 md:gap-4 flex-1">
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-dark-bg border border-dark-border rounded-full pl-9 pr-4 py-1.5 text-sm text-white focus:border-brand-500 w-full outline-none"
                                    />
                                </div>
                                <div className="hidden sm:flex bg-dark-bg rounded-lg p-1 border border-dark-border">
                                    <button 
                                        onClick={() => setSortBy('newest')}
                                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${sortBy === 'newest' ? 'bg-dark-surface text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Newest
                                    </button>
                                    <button 
                                        onClick={() => setSortBy('popular')}
                                        className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${sortBy === 'popular' ? 'bg-dark-surface text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        <Flame className="w-3 h-3" /> Pop
                                    </button>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    if(currentUser) setShowCreateModal(true);
                                    else alert("Please login to create a thread");
                                }}
                                className="ml-2 bg-brand-600 hover:bg-brand-500 text-white p-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2 font-medium text-sm shadow-lg shadow-brand-900/20 transition-all"
                            >
                                <Plus className="w-4 h-4" /> <span className="hidden md:inline">New Thread</span>
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-4 w-full">
                            <button 
                                onClick={() => setActiveThread(null)}
                                className="text-slate-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
                            >
                                <ChevronDown className="w-4 h-4 rotate-90" /> Back
                            </button>
                            <div className="w-px h-6 bg-dark-border"></div>
                            <span className="text-sm text-slate-400 truncate">
                                <span className="text-slate-500 hidden sm:inline">Category:</span> {categories.find(c => c.id === activeThread.categoryId)?.name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    
                    {/* THREAD LIST VIEW */}
                    {!activeThread ? (
                        <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto">
                            {filteredThreads.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 bg-dark-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-dark-border">
                                        <Search className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-300">No threads found</h3>
                                    <p className="text-slate-500">Select a category or create a new discussion.</p>
                                </div>
                            )}
                            {filteredThreads.map(thread => (
                                <div 
                                    key={thread.id}
                                    onClick={() => setActiveThread(thread)}
                                    className="bg-dark-surface border border-dark-border rounded-xl p-4 md:p-5 cursor-pointer hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-900/10 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <img src={thread.authorAvatar} className="w-6 h-6 rounded-full object-cover" />
                                            <span className="text-sm font-bold text-slate-300 group-hover:text-brand-400 transition-colors truncate max-w-[100px] sm:max-w-none">{thread.authorName}</span>
                                            <span className="text-xs text-slate-500 flex-shrink-0">• {timeAgo(thread.createdAt)}</span>
                                        </div>
                                        <div className="flex gap-1 flex-wrap justify-end">
                                            {thread.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-dark-bg border border-dark-border px-2 py-0.5 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-base md:text-lg font-bold text-slate-100 mb-2 group-hover:text-white transition-colors leading-snug">{thread.title}</h3>
                                    <p className="text-slate-400 text-xs md:text-sm line-clamp-2 mb-4">{thread.content}</p>

                                    <div className="flex items-center justify-between pt-3 border-t border-dark-border/50">
                                        <div className="flex items-center gap-3 md:gap-4 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1 group-hover:text-brand-300 transition-colors">
                                                <MessageSquare className="w-3 h-3" /> {thread.repliesCount}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" /> {thread.views}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ThumbsUp className="w-3 h-3" /> {thread.likes}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600 flex items-center gap-1">
                                            {timeAgo(thread.lastActive)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* THREAD DETAIL VIEW */
                        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                            
                            {/* Original Post */}
                            <div className="bg-dark-surface border border-dark-border rounded-xl p-4 md:p-6 mb-6 shadow-xl">
                                 <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full p-0.5 bg-gradient-to-br from-brand-400 to-purple-500">
                                            <img src={activeThread.authorAvatar} className="w-full h-full rounded-full border-2 border-dark-surface object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <h1 className="text-lg md:text-2xl font-bold text-white leading-tight break-words">{activeThread.title}</h1>
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                <span className="text-brand-400 font-medium truncate">{activeThread.authorName}</span>
                                                <span className="text-slate-500 text-xs flex-shrink-0">• {timeAgo(activeThread.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                         <button className="p-2 text-slate-400 hover:text-white hover:bg-dark-bg rounded transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                                    </div>
                                 </div>

                                 <div className="prose prose-invert max-w-none text-slate-300 mb-8 text-sm md:text-base leading-relaxed break-words">
                                     {activeThread.content}
                                 </div>

                                 <div className="flex flex-wrap items-center gap-2 mb-6">
                                     {activeThread.tags.map(tag => (
                                         <span key={tag} className="text-xs font-bold text-brand-300 bg-brand-900/20 border border-brand-500/20 px-2 py-1 rounded flex items-center gap-1">
                                             <Hash className="w-3 h-3" /> {tag}
                                         </span>
                                     ))}
                                 </div>

                                 <div className="flex items-center gap-4 border-t border-dark-border pt-4">
                                     <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors text-sm font-medium shadow-lg shadow-brand-900/20">
                                         <CornerDownRight className="w-4 h-4" /> Reply
                                     </button>
                                     <button className="flex items-center gap-2 px-4 py-2 bg-dark-bg border border-dark-border text-slate-300 rounded-lg hover:text-white transition-colors text-sm font-medium">
                                         <ThumbsUp className="w-4 h-4" /> {activeThread.likes}
                                     </button>
                                 </div>
                            </div>

                            {/* Comments Section */}
                            <div className="relative pb-20">
                                 <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-dark-border -z-10"></div>
                                 <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                                     <MessageSquare className="w-5 h-5 text-brand-400" /> {comments.length} Comments
                                 </h3>
                                 
                                 <div className="space-y-2">
                                     {comments.map(comment => (
                                         <CommentNode key={comment.id} comment={comment} />
                                     ))}
                                 </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {showCreateModal && <CreateThreadModal categories={categories} onClose={() => setShowCreateModal(false)} />}
    </div>
  );
};

export default Forum;