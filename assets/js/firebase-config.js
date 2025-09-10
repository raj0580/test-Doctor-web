// Firebase SDK থেকে প্রয়োজনীয় ফাংশন ইম্পোর্ট করা হচ্ছে
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔴 গুরুত্বপূর্ণ: এখানে আপনার নিজের Firebase প্রজেক্টের কনফিগারেশন দিন
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase ইনিশিয়ালাইজ করা হচ্ছে
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// অন্য ফাইল থেকে ব্যবহারের জন্য এক্সপোর্ট করা হচ্ছে
export { auth, db };
