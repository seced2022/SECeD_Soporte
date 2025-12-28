import { auth, db } from "./firebase.js";
import { qs, requireAuth, attachHeaderUser } from "./common.js";
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

let rallyId = null;
let controlId = null;
let unsub = null;

function setMsg(t) { qs("#msg").textContent = t; }

function parseManualToDate(manualHms) {
  // Acepta HH:MM:SS o HH:MM:SS.mmm
  const m = manualHms.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!m) return null;

  const h = Number(m[1]), mi = Number(m[2]), s = Number(m[3]);
  const ms = m[4] ? Number(String(m[4]).padEnd(3, "0")) : 0;

  const d = new Date();
  d.setHours(h, mi, s, ms);
  return d;
}


function renderTape(rows) {
  const tb = qs("#tape");
  tb.innerHTML = rows.map(r => {
    const dt = r.finalTs?.toDate ? r.finalTs.toDate() : (r.finalTs instanceof Date ? r.finalTs : null);
    const hhmmss = dt ? dt.toLocaleTimeString("es-ES", { hour12: false }) : "-";
    return `<tr>
      <td class="mono">${hhmmss}</td>
      <td><b>${r.dorsal ?? ""}</b></td>
      <td><span class="badge">${r.source ?? "-"}</span></td>
      <td class="small">${(r.notes ?? "").toString()}</td>
    </tr>`;
  }).join("");
}

requireAuth({
  onReady: async ({ user, profile }) => {
    attachHeaderUser({ user, profile });

    qs("#connectBtn").addEventListener("click", async () => {
      rallyId = qs("#rallyId").value.trim();
      controlId = qs("#controlId").value.trim();
      if (!rallyId || !controlId) return setMsg("Falta rallyId o controlId.");

      if (unsub) unsub();

      const itemsRef = collection(db, "rallies", rallyId, "marks", controlId, "items");
      const q = query(itemsRef, orderBy("createdAt", "desc"), limit(50));
      unsub = onSnapshot(q, (snap) => {
        const rows = snap.docs.map(d => d.data());
        renderTape(rows);
      });

      setMsg(`Conectado a rally=${rallyId}, control=${controlId}`);
      qs("#dorsal").focus();
    });

    async function doMark({ manualHms }) {
      if (!rallyId || !controlId) return setMsg("Conecta primero (rallyId y controlId).");
      const dorsal = qs("#dorsal").value.trim();
      if (!dorsal) return setMsg("Pon dorsal.");

      const itemsRef = collection(db, "rallies", rallyId, "marks", controlId, "items");

      const tsAuto = serverTimestamp();
      let source = "auto";
      let finalTs = tsAuto;
      let tsManual = null;

      if (manualHms) {
        const dt = parseManualToDate(manualHms);
        if (!dt) return setMsg("Manual inválido. Formato: HH:MM:SS");
        source = "manual";
        tsManual = dt;
        finalTs = dt;
      }

      await addDoc(itemsRef, {
        dorsal,
        teamId: null,
        tsAuto,
        tsManual,
        finalTs,
        source,
        operatorId: auth.currentUser.uid,
        deviceId: navigator.userAgent.slice(0, 80),
        notes: "",
        createdAt: serverTimestamp()
      });

      qs("#dorsal").value = "";
      qs("#manualHms").value = "";
      qs("#dorsal").focus();
      setMsg("Marcado.");
    }

    qs("#markBtn").addEventListener("click", () => doMark({ manualHms: "" }));
    qs("#markManualBtn").addEventListener("click", () => doMark({ manualHms: qs("#manualHms").value }));

    qs("#dorsal").addEventListener("keydown", (e) => {
      if (e.key === "Enter") qs("#markBtn").click();
    });
  }
});
