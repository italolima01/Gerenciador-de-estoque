// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "liquidassets-qvu6a",
  "appId": "1:945417281476:web:cb72059253cd0fda19ce91",
  "storageBucket": "liquidassets-qvu6a.firebasestorage.app",
  "apiKey": "AIzaSyCwl0Mlap-mqVxGE5ku2ObkCpZLEC_mb60",
  "authDomain": "liquidassets-qvu6a.firebaseapp.com",
  "messagingSenderId": "945417281476"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
