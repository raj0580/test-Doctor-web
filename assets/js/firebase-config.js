// Firebase SDK থেকে প্রয়োজনীয় ফাংশন ইম্পোর্ট করা হচ্ছে
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9tQ9a8buiWOMCy8m5ZA7M07WVo5lPigI",
  authDomain: "doctor-web-test-ca38e.firebaseapp.com",
  projectId: "doctor-web-test-ca38e",
  storageBucket: "doctor-web-test-ca38e.firebasestorage.app",
  messagingSenderId: "167806498685",
  appId: "1:167806498685:web:177aee8141ae4edb44fe14"
};

// Firebase ইনিশিয়ালাইজ করা হচ্ছে
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// অন্য ফাইল থেকে ব্যবহারের জন্য এক্সপোর্ট করা হচ্ছে
export { auth, db };
