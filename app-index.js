import { auth, db } from "./firebase.js";
import { qs } from "./common.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

function setMsg(t) { qs("#msg").textContent = t; }

qs("#loginBtn").addEventListener("click", async () => {
  try {
    const email = qs("#email").value.trim();
    const pass = qs("#pass").value;
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = "./visor.html";
  } catch (e) {
    setMsg(e.message);
  }
});

qs("#registerBtn").addEventListener("click", async () => {
  try {
    const email = qs("#email").value.trim();
    const pass = qs("#pass").value;
    const cred = await createUserWithEmailAndPassword(auth, email, pass);

    await setDoc(doc(db, "users", cred.user.uid), {
      role: "viewer",
      createdAt: serverTimestamp()
    }, { merge: true });

    window.location.href = "./visor.html";
  } catch (e) {
    setMsg(e.message);
  }
});
