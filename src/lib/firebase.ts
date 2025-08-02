
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "liquidassets-qvu6a",
  appId: "1:945417281476:web:cb72059253cd0fda19ce91",
  storageBucket: "liquidassets-qvu6a.firebasestorage.app",
  apiKey: "AIzaSyCwl0Mlap-mqVxGE5ku2ObkCpZLEC_mb60",
  authDomain: "liquidassets-qvu6a.firebaseapp.com",
  messagingSenderId: "945417281476",
  databaseURL: "https://liquidassets-qvu6a-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
