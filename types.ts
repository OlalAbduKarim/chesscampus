
export enum Page {
  STREAM_HUB = 'STREAM_HUB',
  FORUM = 'FORUM',
  PLAY_AREA = 'PLAY_AREA',
  PRIVATE_LESSON = 'PRIVATE_LESSON'
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  rating: number;
  isOnline?: boolean;
}

export interface Streamer {
  id: string;
  name: string;
  title: string;
  viewers: number;
  avatar: string;
  thumbnail: string;
  tags: string[];
  isLive: boolean;
}

export interface ChatMessage {
  id: string;
  uid?: string;
  user: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
}

export enum GameMode {
  ANALYSIS = 'Analysis',
  VS_AI = 'Vs AI',
  PVP = 'PvP'
}

// --- FORUM TYPES ---

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

export interface ForumUser {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'playing';
}

export interface ForumComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: number; // Milliseconds
  likes: number;
  depth: number;
  parentId?: string;
  replies?: ForumComment[];
}

export interface ForumThread {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  categoryId: string;
  content: string;
  tags: string[];
  repliesCount: number;
  views: number;
  likes: number;
  createdAt: number; // Milliseconds
  lastActive: number; // Milliseconds
  // Comments are usually fetched separately in Firestore, but kept here for UI convenience if pre-fetched
  comments?: ForumComment[]; 
}

export interface PrivateChat {
  id: string;
  partner: ForumUser;
  lastMessage: string;
  timestamp: number;
  unread: number;
  messages?: ChatMessage[]; // Loaded on open
}
