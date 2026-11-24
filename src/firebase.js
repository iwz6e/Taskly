
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCF7i7mhKZdKuN8D1W3P0JSZovkQKwPqEI",
  authDomain: "taskly-dff40.firebaseapp.com",
  projectId: "taskly-dff40",
  storageBucket: "taskly-dff40.firebasestorage.app",
  messagingSenderId: "426817486014",
  appId: "1:426817486014:web:da9854b32b0dd25d04f2ef"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
