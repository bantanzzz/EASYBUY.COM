import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwm8uXxDxrgUGYydKp2htfdqpkFwa9ih4",
  authDomain: "easybuy-c29ba.firebaseapp.com",
  projectId: "easybuy-c29ba",
  storageBucket: "easybuy-c29ba.firebasestorage.app",
  messagingSenderId: "651266478389",
  appId: "1:651266478389:web:32aa6f8e3e1e3f6d59fc7c",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
