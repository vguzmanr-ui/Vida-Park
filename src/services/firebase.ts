import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCXru9a57OggxAiDReVM6CqO_zA7Aj5orw",
  authDomain: "vida-park-fd564.firebaseapp.com",
  projectId: "vida-park-fd564",
  storageBucket: "vida-park-fd564.firebasestorage.app",
  messagingSenderId: "270954818243",
  appId: "1:270954818243:web:f6a3e4c9ce1d8c0dd5d076"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);
