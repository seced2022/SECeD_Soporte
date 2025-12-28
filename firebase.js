// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCA5v58tznDcjeMJFbLKG8j29Im0wLQnSI",
  authDomain: "secedsoporte.firebaseapp.com",
  projectId: "secedsoporte",
  storageBucket: "secedsoporte.firebasestorage.app",
  messagingSenderId: "583549921006",
  appId: "1:583549921006:web:6a625970a7d6215447b5ff"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
