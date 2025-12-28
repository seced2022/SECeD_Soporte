// common.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export function qs(sel) { return document.querySelector(sel); }

export function fmtHMS(ms) {
  if (ms == null || Number.isNaN(ms)) return "-";
  const sign = ms < 0 ? "-" : "";
  ms = Math.abs(ms);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${sign}${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtSec(sec) {
  if (sec == null || Number.isNaN(sec)) return "-";
  return `${Math.round(sec)} s`;
}

export function requireAuth({ onReady }) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "./index.html";
      return;
    }
    const profile = await getUserProfile(user.uid);
    onReady({ user, profile });
  });
}

export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile = { role: "viewer", createdAt: serverTimestamp() };
    await setDoc(ref, profile, { merge: true });
    return profile;
  }
  return snap.data();
}

export async function logout() {
  await signOut(auth);
  window.location.href = "./index.html";
}

export function attachHeaderUser({ user, profile }) {
  const el = qs("#whoami");
  if (el) el.textContent = `${user.email} · ${profile.role}`;
  const btn = qs("#logoutBtn");
  if (btn) btn.addEventListener("click", logout);
}

/**
 * Ajustes CH:
 * early/late: { marginSec, unitSec, rateSecPerUnit, rounding }
 * rounding: "none" | "ceil_unit" | "floor_unit" | "nearest_unit"
 */
export function calcChPenaltySec(deltaSec, chSettings) {
  if (!chSettings) return 0;

  const isEarly = deltaSec < 0;
  const side = isEarly ? chSettings.early : chSettings.late;
  if (!side) return 0;

  const absSec = Math.abs(deltaSec);
  const margin = Number(side.marginSec ?? 0);
  if (absSec <= margin) return 0;

  const unitSec = Math.max(1, Number(side.unitSec ?? 1));
  const rate = Math.max(0, Number(side.rateSecPerUnit ?? 0));

  const rawUnits = (absSec - margin) / unitSec;

  let units;
  switch (side.rounding) {
    case "ceil_unit": units = Math.ceil(rawUnits); break;
    case "floor_unit": units = Math.floor(rawUnits); break;
    case "nearest_unit": units = Math.round(rawUnits); break;
    case "none":
    default:
      units = rawUnits;
  }

  const pen = units * rate;

  const maxPenaltySec = Number(chSettings.maxPenaltySec ?? 0);
  if (maxPenaltySec > 0) return Math.min(pen, maxPenaltySec);

  return pen;
}

export function assertRole(profile, allowed) {
  return allowed.includes(profile.role);
}
