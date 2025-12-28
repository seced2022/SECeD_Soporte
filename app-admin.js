import { db } from "./firebase.js";
import { qs, requireAuth, attachHeaderUser, calcChPenaltySec, assertRole } from "./common.js";

import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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

async function refreshLists() {
  if (!currentRallyId) return;

  // TCS
  const tcsRef = collection(db, "rallies", currentRallyId, "tcs");
  const tcsSnap = await getDocs(tcsRef);
  const tcs = tcsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const tcListEl = qs("#tcList");
  if (tcListEl) {
    tcListEl.textContent = tcs.map(t => `${t.id} | ${t.order} | ${t.name}`).join("\n") || "-";
  }

  // CONTROLS
  const ctrRef = collection(db, "rallies", currentRallyId, "controls");
  const ctrSnap = await getDocs(ctrRef);
  const ctr = ctrSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const controlListEl = qs("#controlList");
  if (controlListEl) {
    controlListEl.textContent = ctr
      .map(c => `${c.id} | ${c.type} | tc=${c.tcId ?? "-"} | ord=${c.orderInTc ?? "-"} | ${c.name ?? ""}`)
      .join("\n") || "-";
  }
}

requireAuth({
  onReady: async ({ user, profile }) => {
    attachHeaderUser({ user, profile });

    if (!assertRole(profile, ["admin"])) {
      setMsg("Acceso denegado: necesitas rol admin.");
      const saveBtn = qs("#saveBtn");
      if (saveBtn) saveBtn.disabled = true;
      return;
    }

    // Cargar rally
    qs("#loadBtn").addEventListener("click", async () => {
      const rallyId = qs("#rallyId").value.trim();
      if (!rallyId) return setMsg("Pon un Rally ID.");

      currentRallyId = rallyId;
      await loadOrCreateRally(rallyId);
      await refreshLists();
      setMsg(`Rally cargado: ${rallyId}`);
    });

    // Guardar penalizaciones CH
    qs("#saveBtn").addEventListener("click", async () => {
      if (!currentRallyId) return setMsg("Carga primero un Rally ID.");

      const payload = readSettingsFromUI();
      await setDoc(doc(db, "rallies", currentRallyId, "settings", "chPenalties"), {
        ...payload,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMsg("Penalizaciones CH guardadas.");
    });

    // Test penalización
    qs("#testBtn").addEventListener("click", () => {
      const delta = Number(qs("#testDelta").value || 0);
      const s = readSettingsFromUI();
      const pen = calcChPenaltySec(delta, s);
      qs("#testOut").textContent = `${pen.toFixed(2)} s`;
    });

    // Crear / Actualizar TC
    const addTcBtn = qs("#addTcBtn");
    if (addTcBtn) {
      addTcBtn.addEventListener("click", async () => {
        if (!currentRallyId) return setMsg("Carga primero un Rally ID.");

        const tcId = qs("#tcId").value.trim();
        if (!tcId) return setMsg("TC ID vacío (ej: TC1).");

        await setDoc(doc(db, "rallies", currentRallyId, "tcs", tcId), {
          order: Number(qs("#tcOrder").value || 0),
          name: qs("#tcName").value.trim(),
          status: "open",
          updatedAt: serverTimestamp()
        }, { merge: true });

        setMsg(`TC guardado: ${tcId}`);
        await refreshLists();
      });
    }

    // Crear / Actualizar Control
    const addControlBtn = qs("#addControlBtn");
    if (addControlBtn) {
      addControlBtn.addEventListener("click", async () => {
        if (!currentRallyId) return setMsg("Carga primero un Rally ID.");

        const controlId = qs("#controlNewId").value.trim();
        if (!controlId) return setMsg("Control ID vacío (ej: TC1_START).");

        await setDoc(doc(db, "rallies", currentRallyId, "controls", controlId), {
          type: qs("#controlType").value,
          tcId: qs("#controlTcId").value.trim() || null,
          orderInTc: Number(qs("#controlOrderInTc").value || 0),
          name: qs("#controlName").value.trim(),
          enabled: true,
          updatedAt: serverTimestamp()
        }, { merge: true });

        setMsg(`Control guardado: ${controlId}`);
        await refreshLists();
      });
    }
  }
});
