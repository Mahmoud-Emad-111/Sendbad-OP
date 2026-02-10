
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// Try to load service account credentials
let serviceAccount;
try {
  serviceAccount = require("./storage/app/firebase_credentials.json");
} catch (error) {
  console.error("Error loading firebase_credentials.json:", error.message);
  process.exit(1);
}

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://sindbad-2026-default-rtdb.firebaseio.com"
});

const db = getDatabase();
const ref = db.ref("locations");

console.log("Reading data from 'locations' node...");

ref.once("value", (snapshot) => {
  const data = snapshot.val();
  console.log("Data in Firebase:", JSON.stringify(data, null, 2));
  if (data) {
      console.log("SUCCESS: Data exists in 'locations' node.");
  } else {
      console.log("WARNING: 'locations' node is null or empty.");
  }
  process.exit(0);
}, (error) => {
  console.error("Error reading data:", error);
  process.exit(1);
});
