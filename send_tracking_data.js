
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import fs from 'fs';

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
const ref = db.ref("/"); // Ref to root

// Load the data to import
const dataPath = './dashboard/firebase_import_root.json';

try {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const jsonData = JSON.parse(rawData);

  console.log("Pushing data to Firebase...", jsonData);

  ref.update(jsonData, (error) => {
    if (error) {
      console.error("Data could not be saved." + error);
      process.exit(1);
    } else {
      console.log("Data saved successfully!");
      process.exit(0);
    }
  });

} catch (error) {
  console.error("Error reading data file:", error.message);
  process.exit(1);
}
