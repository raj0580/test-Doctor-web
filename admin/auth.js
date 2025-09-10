import { auth } from '../assets/js/firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('login-error');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMessage.textContent = '';

    signInWithEmailAndPassword(auth, email, password)
        .then(() => { window.location.href = 'dashboard.html'; })
        .catch(() => { errorMessage.textContent = 'ভুল ইমেল অথবা পাসওয়ার্ড।'; });
});
