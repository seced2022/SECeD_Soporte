import { db } from "./firebase.js";
import { qs, requireAuth, attachHeaderUser, fmtHMS, fmtSec, calcChPenaltySec } from "./common.js";
import { doc, getDoc, collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

function setMsg(t) { qs("#msg").textContent = t; }

async function loadControlMarksByDorsal(rallyId, controlId) {
  const itemsRef = collection(db, "rallies", rallyId, "marks", controlId, "items");
  const snap = await getDocs(query(itemsRef));
  const map = new Map(); // dorsal -> row
  for (const d of snap.docs) {
    const r = d.data();
    const dorsal = String(r.dorsal ?? "").trim();
    if (!dorsal) continue;

    const prev = map.get(dorsal);
    if (!prev) map.set(dorsal, r);
    else {
      const prevCreated = prev.createdAt?.toMillis?.() ?? 0;
      const curCreated = r.createdAt?.toMillis?.() ?? 0;
      if (curCreated >= prevCreated) map.set(dorsal, r);
    }
  }
  return map;
}

function tsToMillis(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts.getTime();
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return null;
}

requireAuth({
  onReady: async ({ user, profile }) => {
    attachHeaderUser({ user, profile });

    qs("#loadBtn").addEventListener("click", async () => {
      const rallyId = qs("#rallyId").value.trim();
      if (!rallyId) return setMsg("Pon un rallyId.");

      const chRef = doc(db, "rallies", rallyId, "settings", "chPenalties");
      const chSnap = await getDoc(chRef);
      const chSettings = chSnap.exists() ? chSnap.data() : null;

      const tc1Start = await loadControlMarksByDorsal(rallyId, "TC1_START");
      const tc1Finish = await loadControlMarksByDorsal(rallyId, "TC1_FINISH");
      const tc2Start = await loadControlMarksByDorsal(rallyId, "TC2_START");
      const tc2Finish = await loadControlMarksByDorsal(rallyId, "TC2_FINISH");
      const ch1 = await loadControlMarksByDorsal(rallyId, "CH1");

      // Ideal demo: hoy 12:00:00 (para todos). Luego se enlaza a idealTimes reales.
      const ideal = new Date();
      ideal.setHours(12, 0, 0, 0);
      const idealMs = ideal.getTime();

      const dorsales = new Set([
        ...tc1Start.keys(), ...tc1Finish.keys(),
        ...tc2Start.keys(), ...tc2Finish.keys(),
        ...ch1.keys()
      ]);

      const results = [];
      for (const dorsal of dorsales) {
        const s1 = tsToMillis(tc1Start.get(dorsal)?.finalTs);
        const f1 = tsToMillis(tc1Finish.get(dorsal)?.finalTs);
        const s2 = tsToMillis(tc2Start.get(dorsal)?.finalTs);
        const f2 = tsToMillis(tc2Finish.get(dorsal)?.finalTs);

        const t1 = (s1 != null && f1 != null) ? (f1 - s1) : null;
        const t2 = (s2 != null && f2 != null) ? (f2 - s2) : null;

        const realCh = tsToMillis(ch1.get(dorsal)?.finalTs);

        let penCh1 = 0;
        if (realCh != null && chSettings) {
          const deltaSec = (realCh - idealMs) / 1000;
          penCh1 = calcChPenaltySec(deltaSec, chSettings);
        }

        const totalMs = (t1 ?? 0) + (t2 ?? 0) + (penCh1 * 1000);
        results.push({ dorsal, t1, t2, penCh1, totalMs });
      }

      results.sort((a, b) => a.totalMs - b.totalMs);

      qs("#rows").innerHTML = results.map(r => `
        <tr>
          <td><b>${r.dorsal}</b></td>
          <td class="mono">${fmtHMS(r.t1)}</td>
          <td class="mono">${fmtHMS(r.t2)}</td>
          <td class="mono">${fmtSec(r.penCh1)}</td>
          <td class="mono"><b>${fmtHMS(r.totalMs)}</b></td>
        </tr>
      `).join("");

      setMsg(`Cargado. Dorsales: ${results.length}. (Demo fija TC1/TC2/CH1)`);
    });
  }
});
