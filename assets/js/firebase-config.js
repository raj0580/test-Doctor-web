import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ config.js থেকে সরাসরি ইম্পোর্ট করা হচ্ছে
import { CONFIG } from '../../config.js';

// ✅ window অবজেক্টের উপর আর নির্ভর করতে হবে না
const firebaseConfig = CONFIG.FIREBASE_CONFIG;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
