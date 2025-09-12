import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

const authModal = document.getElementById('auth-modal');
const authView = document.getElementById('auth-view');

const loginViewHTML = `
    <h3>Login to your Account</h3>
    <p class="error-message" id="auth-error"></p>
    <input type="email" id="login-email" placeholder="Email Address" required>
    <input type="password" id="login-password" placeholder="Password" required>
    <button id="login-btn" class="cta-btn">Login</button>
    <p class="auth-toggle-link"><a href="#" id="show-forgot">Forgot Password?</a></p>
    <p class="auth-toggle-link">Don't have an account? <a href="#" id="show-register">Register</a></p>
`;

const registerViewHTML = `
    <h3>Create a New Account</h3>
    <p class="error-message" id="auth-error"></p>
    <input type="text" id="register-name" placeholder="Full Name" required>
    <input type="email" id="register-email" placeholder="Email Address" required>
    <input type="password" id="register-password" placeholder="Password (min. 6 characters)" required>
    <button id="register-btn" class="cta-btn">Register</button>
    <p class="auth-toggle-link">Already have an account? <a href="#" id="show-login">Login</a></p>
`;

const forgotViewHTML = `
    <h3>Reset Password</h3>
    <p>Enter your email and we'll send you a link to reset your password.</p>
    <p class="error-message" id="auth-error"></p>
    <input type="email" id="forgot-email" placeholder="Email Address" required>
    <button id="forgot-btn" class="cta-btn">Send Reset Link</button>
    <p class="auth-toggle-link"><a href="#" id="back-to-login">Back to Login</a></p>
`;

function renderLoginView() {
    authView.innerHTML = loginViewHTML;
    document.getElementById('show-register').addEventListener('click', (e) => { e.preventDefault(); renderRegisterView(); });
    document.getElementById('show-forgot').addEventListener('click', (e) => { e.preventDefault(); renderForgotView(); });
    document.getElementById('login-btn').addEventListener('click', handleLogin);
}

function renderRegisterView() {
    authView.innerHTML = registerViewHTML;
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); renderLoginView(); });
    document.getElementById('register-btn').addEventListener('click', handleRegister);
}

function renderForgotView() {
    authView.innerHTML = forgotViewHTML;
    document.getElementById('back-to-login').addEventListener('click', (e) => { e.preventDefault(); renderLoginView(); });
    document.getElementById('forgot-btn').addEventListener('click', handleForgot);
}

export function showAuthModal() {
    renderLoginView();
    if (authModal) authModal.classList.remove('hidden');
}
export function closeAuthModal() {
    if (authModal) authModal.classList.add('hidden');
}

async function handleLogin() { /* Unchanged from previous */ }
async function handleRegister() { /* Unchanged from previous */ }

async function handleForgot() {
    const email = document.getElementById('forgot-email').value;
    const errorEl = document.getElementById('auth-error');
    try {
        await sendPasswordResetEmail(auth, email);
        errorEl.style.color = 'green';
        errorEl.textContent = 'Password reset link sent! Check your inbox.';
    } catch(error) {
        errorEl.style.color = 'var(--accent-color)';
        errorEl.textContent = getAuthErrorMessage(error);
    }
}

function getAuthErrorMessage(error) { /* Unchanged from previous */ }
export function setupAuthListeners() { /* Unchanged from previous */ }
