import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, off } from "firebase/database";

// Configuration for 'sindbad-2026'
// Note: API Key and App ID need to be obtained from Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyCNAamux5dsHfkozAkU5L7u4fiAW98uz-M",
  authDomain: "sindbad-2026.firebaseapp.com",
  databaseURL: "https://sindbad-2026-default-rtdb.firebaseio.com",
  projectId: "sindbad-2026",
  storageBucket: "sindbad-2026.firebasestorage.app",
  messagingSenderId: "49910575312",
  appId: "1:49910575312:web:ae35dda2863931e8566ed5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const subscribeToLocations = (callback: (locations: any) => void) => {
  const locationsRef = ref(db, 'locations');
  const unsubscribe = onValue(locationsRef, (snapshot) => {
    const data = snapshot.val() || {};
    // Check for accidental nesting (locations -> locations)
    if (data.locations) {
        callback(data.locations);
    } else {
        callback(data);
    }
  });

  return () => off(locationsRef, 'value', unsubscribe);
};

export const subscribeToTechnicianLocation = (techId: number | string, callback: (location: any) => void) => {
  const locationRef = ref(db, `locations/${techId}`);
  const unsubscribe = onValue(locationRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || null);
  });

  return () => off(locationRef, 'value', unsubscribe);
};
