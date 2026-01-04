import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Configuration from User
const firebaseConfig = {
  apiKey: "AIzaSyCPcwMh-BkcLkOpVtuWo9lfYUgaEPlw4Fo",
  authDomain: "sindbad-7b3e3.firebaseapp.com",
  databaseURL: "https://sindbad-7b3e3-default-rtdb.firebaseio.com",
  projectId: "sindbad-7b3e3",
  storageBucket: "sindbad-7b3e3.firebasestorage.app",
  messagingSenderId: "1073870566936",
  appId: "1:1073870566936:web:2f9cebe176fbcf78fd756d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
