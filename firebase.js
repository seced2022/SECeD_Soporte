// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export const auth = getAuth(app);
export const db = getFirestore(app);

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCA5v58tznDcjeMJFbLKG8j29Im0wLQnSI",
  authDomain: "secedsoporte.firebaseapp.com",
  projectId: "secedsoporte",
  storageBucket: "secedsoporte.firebasestorage.app",
  messagingSenderId: "583549921006",
  appId: "1:583549921006:web:6a625970a7d6215447b5ff"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
