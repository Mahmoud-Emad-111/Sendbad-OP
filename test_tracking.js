import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const serviceAccount = require("./storage/app/firebase_credentials.json");

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://sindbad-2026-default-rtdb.firebaseio.com"
});

const db = getDatabase();
const ref = db.ref("locations/51");

const data = {
  lat: 23.6880,
  lng: 58.4829,
  timestamp: Date.now(),
  user_id: 51,
  speed: 10,
  heading: 45
};

console.log("Sending data to locations/51...", data);

ref.set(data).then(() => {
    console.log("Data saved successfully.");
    process.exit(0);
}).catch((error) => {
    console.error("Data could not be saved." + error);
    process.exit(1);
});
