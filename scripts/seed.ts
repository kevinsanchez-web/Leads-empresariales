import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch, getDocs } from "firebase/firestore";
import { INITIAL_LEADS, MOCK_USERS, MOCK_EVENTS } from "../src/data/mockData";

const firebaseConfig = {
  apiKey: "AIzaSyBhX-iyMSfPptJcnTTua5RLFRpxz6_r5kg",
  authDomain: "leads-divergency.firebaseapp.com",
  projectId: "leads-divergency",
  storageBucket: "leads-divergency.firebasestorage.app",
  messagingSenderId: "153858062764",
  appId: "1:153858062764:web:4dd46c4ee8ea961ac32209",
};

async function seedCollection(name: string, items: { id: string }[]) {
  const db = getFirestore();
  const existing = await getDocs(collection(db, name));
  if (!existing.empty) {
    console.log(`"${name}" ya tiene ${existing.size} documento(s), no se vuelve a sembrar.`);
    return;
  }
  const batch = writeBatch(db);
  items.forEach((item) => batch.set(doc(db, name, item.id), item));
  await batch.commit();
  console.log(`Sembrados ${items.length} documentos en "${name}".`);
}

async function main() {
  initializeApp(firebaseConfig);
  await seedCollection("events", MOCK_EVENTS);
  await seedCollection("users", MOCK_USERS);
  await seedCollection("leads", INITIAL_LEADS);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error sembrando Firestore:", err);
  process.exit(1);
});
