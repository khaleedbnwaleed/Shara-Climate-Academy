import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeam1INMwXesDegwWiDef8u78dunhWHiY",
  authDomain: "shara-climate-ad59c.firebaseapp.com",
  projectId: "shara-climate-ad59c",
  storageBucket: "shara-climate-ad59c.firebasestorage.app",
  messagingSenderId: "577674492589",
  appId: "1:577674492589:web:d1f8dc1932c517e6536424"
};

// Initialize app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

//  Create auth instance
const auth = getAuth(app);

//  Set persistence IMMEDIATELY and wait for it
let persistenceReady = false;
let persistencePromise: Promise<void> | null = null;

if (typeof window !== 'undefined') {
  persistencePromise = setPersistence(auth, browserLocalPersistence)
    .then(() => {
      persistenceReady = true;
      console.log('Firebase auth persistence set to LOCAL');
    })
    .catch((error) => {
      console.error(' Error setting auth persistence:', error);
    });
}

// Initialize Firestore with cache settings (only once)
let db;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      cache: {
        sizeBytes: CACHE_SIZE_UNLIMITED
      }
    });
  } catch (error) {
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

const storage = getStorage(app);

//  Export persistence ready state for auth context
export { app, auth, db, storage, persistenceReady, persistencePromise };
export default app;