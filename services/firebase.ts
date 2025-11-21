import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG
// Since we are in a demo environment, these are placeholders.
// The app will function with mock data fallbacks if these fail, 
// but real-time features require a valid config.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "mock-key",
  authDomain: "chess-campus-demo.firebaseapp.com",
  projectId: "chess-campus-demo",
  storageBucket: "chess-campus-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  databaseURL: "https://chess-campus-demo-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export default app;