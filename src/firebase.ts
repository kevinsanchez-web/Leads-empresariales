import { initializeApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBhX-iyMSfPptJcnTTua5RLFRpxz6_r5kg",
  authDomain: "leads-divergency.firebaseapp.com",
  projectId: "leads-divergency",
  storageBucket: "leads-divergency.firebasestorage.app",
  messagingSenderId: "153858062764",
  appId: "1:153858062764:web:4dd46c4ee8ea961ac32209",
};

// `npm run dev:local` activa este modo (ver .env.emulators). Los puertos coinciden con firebase.json.
export const USING_EMULATORS = import.meta.env.VITE_USE_EMULATORS === "true";
const EMULATOR_HOST = "127.0.0.1";

const app = initializeApp(firebaseConfig);

// Con emuladores no se usa la caché persistente: datos de una sesión anterior (o del proyecto real)
// no deben mezclarse con los del emulador.
export const db = initializeFirestore(
  app,
  USING_EMULATORS
    ? { ignoreUndefinedProperties: true }
    : {
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      }
);

export const auth = getAuth(app);

if (USING_EMULATORS) {
  connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
}
