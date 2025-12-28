import { db } from "./firebase.js";
import { qs, requireAuth, attachHeaderUser, calcChPenaltySec, assertRole } from "./common.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let currentRallyId = null;

function setMsg(t) { qs("#msg").textContent = t; }

function readSettingsFromUI() {
  return {
    early: {
      marginSec: Number(qs("#earlyMargin").value || 0),
      unitSec: Number(qs("#earlyUnit").value || 1),
      rateSecPerUnit: Number(qs("#earlyRate").value || 0),
      rounding: qs("#earlyRound").value
    },
    late: {
      marginSec: Number(qs("#lateMargin").value || 0),
      unitSec: Number(qs("#lateUnit").value || 1),
      rateSecPerUnit: Number(qs("#lateRate").value || 0),
      rounding: qs("#lateRound").value
    },
    maxPenaltySec: Number(qs("#maxPenalty").value || 0),
  };
}

function writeSettingsToUI(s) {
  qs("#earlyMargin").value = s?.early?.marginSec ?? 0;
  qs("#earlyUnit").value = s?.early?.unitSec ?? 60;
  qs("#earlyRate").value = s?.early?.rateSecPerUnit ?? 10;
  qs("#earlyRound").value = s?.early?.rounding ?? "ceil_unit";

  qs("#lateMargin").value = s?.late?.marginSec ?? 0;
  qs("#lateUnit").value = s?.late?.unitSec ?? 60;
  qs("#lateRate").value = s?.late?.rateSecPerUnit ?? 10;
  qs("#lateRound").value = s?.late?.rounding ?? "ceil_unit";

  qs("#maxPenalty").value = s?.maxPenaltySec ?? 0;
}

async function loadOrCreateRally(rallyId) {
  const rallyRef = doc(db, "rallies", rallyId);
  const snap = await getDoc(rallyRef);
  if (!snap.exists()) {
    await setDoc(rallyRef, {
      name: rallyId,
      status: "active",
      timezone: "Europe/Madrid",
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  const setRef = doc(db, "rallies", rallyId, "settings", "chPenalties");
  const setSnap = await getDoc(setRef);
  if (setSnap.exists()) {
    writeSettingsToUI(setSnap.data());
  } else {
    const defaults = readSettingsFromUI();
    await setDoc(setRef, { ...defaults, updatedAt: serverTimestamp() }, { merge: true });
    writeSettingsToUI(defaults);
  }
}

requireAuth({
  onReady: async ({ user, profile }) => {
    attachHeaderUser({ user, profile });
    if (!assertRole(profile, ["admin"])) {
      setMsg("Acceso denegado: necesitas rol admin.");
      qs("#saveBtn").disabled = true;
      return;
    }

    qs("#loadBtn").addEventListener("click", async () => {
      const rallyId = qs("#rallyId").value.trim();
      if (!rallyId) return setMsg("Pon un Rally ID.");
      currentRallyId = rallyId;
      await loadOrCreateRally(rallyId);
      setMsg(`Rally cargado: ${rallyId}`);
    });

    qs("#saveBtn").addEventListener("click", async () => {
      if (!currentRallyId) return setMsg("Carga primero un Rally ID.");
      const payload = readSettingsFromUI();
      await setDoc(doc(db, "rallies", currentRallyId, "settings", "chPenalties"), {
        ...payload,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setMsg("Guardado.");
    });

    qs("#testBtn").addEventListener("click", () => {
      const delta = Number(qs("#testDelta").value || 0);
      const s = readSettingsFromUI();
      const pen = calcChPenaltySec(delta, s);
      qs("#testOut").textContent = `${pen.toFixed(2)} s`;
    });
  }
});
