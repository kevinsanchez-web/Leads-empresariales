import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBhX-iyMSfPptJcnTTua5RLFRpxz6_r5kg",
  authDomain: "leads-divergency.firebaseapp.com",
  projectId: "leads-divergency",
  storageBucket: "leads-divergency.firebasestorage.app",
  messagingSenderId: "153858062764",
  appId: "1:153858062764:web:4dd46c4ee8ea961ac32209",
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const auth = getAuth(app);
