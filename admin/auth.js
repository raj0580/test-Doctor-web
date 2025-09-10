import { auth } from '../assets/js/firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('login-error');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    errorMessage.textContent = ''; // Clear previous errors

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // সফলভাবে লগইন হলে ড্যাশবোর্ডে পাঠান
            window.location.href = 'dashboard.html';
        })
        .catch((error) => {
            // ভুল হলে এরর মেসেজ দেখান
            console.error("Login failed:", error.code);
            errorMessage.textContent = 'ভুল ইমেল অথবা পাসওয়ার্ড।';
        });
});
