import { RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

const authModal = document.getElementById('auth-modal');
const otpContainer = document.getElementById('otp-container');
const phoneInput = document.getElementById('phone-input');
const sendOtpBtn = document.getElementById('send-otp-btn');
const verifyOtpBtn = document.getElementById('verify-otp-btn');

function renderRecaptcha() {
    // Ensure it's rendered only once
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal', // Use 'normal' size for the visible element
            'callback': (response) => {
                // reCAPTCHA solved, this is automatically handled by signInWithPhoneNumber
                console.log("reCAPTCHA solved");
            },
            'expired-callback': () => {
                // Response expired. Ask user to solve reCAPTCHA again.
                console.log("reCAPTCHA expired");
            }
        });
        window.recaptchaVerifier.render(); // Explicitly render the widget
    }
}

export function showAuthModal() {
    if (authModal) {
        authModal.classList.remove('hidden');
        // Render reCAPTCHA every time the modal is opened to ensure it's fresh
        setTimeout(renderRecaptcha, 100); 
    }
}

export function closeAuthModal() {
    if (authModal) {
        authModal.classList.add('hidden');
        // Clear the reCAPTCHA so it can be re-rendered next time
        const recaptchaContainer = document.getElementById('recaptcha-container');
        if (recaptchaContainer) recaptchaContainer.innerHTML = '';
        window.recaptchaVerifier = null;
    }
}

export function setupAuthListeners() {
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', () => {
            const tenDigitNumber = phoneInput.value.trim();
            if (!/^[6-9]\d{9}$/.test(tenDigitNumber)) {
                alert('Please enter a valid 10-digit Indian mobile number.');
                return;
            }
            const phoneNumber = `+91${tenDigitNumber}`;
            const appVerifier = window.recaptchaVerifier;

            sendOtpBtn.disabled = true;
            sendOtpBtn.textContent = 'Sending...';

            signInWithPhoneNumber(auth, phoneNumber, appVerifier)
                .then(confirmationResult => {
                    window.confirmationResult = confirmationResult;
                    otpContainer.classList.remove('hidden');
                    alert('OTP Sent!');
                }).catch(error => {
                    console.error("OTP Error:", error);
                    alert("Failed to send OTP. Please solve the reCAPTCHA and try again.");
                }).finally(() => {
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.textContent = 'Send OTP';
                });
        });
    }
    
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', () => {
            const code = document.getElementById('otp-input').value;
            if (!code || code.length !== 6) {
                alert('Please enter the 6-digit OTP.');
                return;
            }
            
            verifyOtpBtn.disabled = true;
            verifyOtpBtn.textContent = 'Verifying...';

            window.confirmationResult.confirm(code).then(async (result) => {
                const user = result.user;
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                if (!userDocSnap.exists()) {
                    await setDoc(userDocRef, {
                        phone: user.phoneNumber,
                        name: `User ${user.uid.substring(0, 5)}`,
                        createdAt: serverTimestamp()
                    });
                }
                closeAuthModal();
                window.location.reload();
            }).catch(error => {
                alert("Invalid OTP. Please try again.");
            }).finally(() => {
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = 'Verify OTP';
            });
        });
    }
}
