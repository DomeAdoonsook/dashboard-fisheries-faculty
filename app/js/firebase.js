// Firebase shared config — used by all pages
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDK--LHu280flT2UBqQc85cZAgZ0gSu7m4",
  authDomain: "dashboard-fisheries.firebaseapp.com",
  projectId: "dashboard-fisheries",
  storageBucket: "dashboard-fisheries.firebasestorage.app",
  messagingSenderId: "1002413057784",
  appId: "1:1002413057784:web:c6cba7563409e62cbcfd0d",
  measurementId: "G-135XM49H4J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Helpers ──────────────────────────────────────────────────

// Get a document as plain object (returns null if not found)
export async function fsGet(colPath, docId) {
  const ref = doc(db, colPath, docId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Set (overwrite) a document
export async function fsSet(colPath, docId, data) {
  await setDoc(doc(db, colPath, docId), data);
}

// Get all docs in a collection as array of { id, ...data }
export async function fsGetAll(colPath) {
  const snap = await getDocs(collection(db, colPath));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Delete a document
export async function fsDelete(colPath, docId) {
  await deleteDoc(doc(db, colPath, docId));
}

// Listen to a collection in realtime
export function fsListen(colPath, callback) {
  return onSnapshot(collection(db, colPath), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export { db };
