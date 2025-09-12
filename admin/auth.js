import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from '../assets/js/firebase-config.js';

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('login-error');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorMessage.textContent = ''; // Clear previous errors

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // **Crucial Security Check:** Verify if the logged-in user is an admin.
        const adminRef = doc(db, 'admins', user.uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists() && adminSnap.data().isAdmin) {
            // User is an admin, proceed to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // User is a regular user, not an admin. Deny access.
            await auth.signOut(); // Log them out immediately
            errorMessage.textContent = 'Access Denied. You are not an admin.';
        }
    } catch (error) {
        // Handle login errors (e.g., wrong password)
        console.error("Login failed:", error.code);
        errorMessage.textContent = 'Invalid email or password.';
    }
});
