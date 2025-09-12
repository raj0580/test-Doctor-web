import { RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

const authModal = document.getElementById('auth-modal');
const otpContainer = document.getElementById('otp-container');
const phoneInput = document.getElementById('phone-input');

export function showAuthModal() {
    if (authModal) authModal.classList.remove('hidden');
}

export function closeAuthModal() {
    if (authModal) authModal.classList.add('hidden');
}

export function setupAuthListeners() {
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', () => {
            const tenDigitNumber = phoneInput.value.trim();
            if (!/^[6-9]\d{9}$/.test(tenDigitNumber)) {
                alert('Please enter a valid 10-digit Indian mobile number.');
                return;
            }
            const phoneNumber = `+91${tenDigitNumber}`;

            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 
                    'size': 'invisible',
                    'callback': (response) => {
                        // reCAPTCHA solved, allow signInWithPhoneNumber.
                    }
                });
            }
            
            sendOtpBtn.disabled = true;
            sendOtpBtn.textContent = 'Sending...';

            signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
                .then(confirmationResult => {
                    window.confirmationResult = confirmationResult;
                    otpContainer.classList.remove('hidden');
                    alert('OTP Sent!');
                }).catch(error => {
                    console.error("OTP Error:", error);
                    alert("Failed to send OTP. Please try again later.");
                    grecaptcha.reset(window.recaptchaWidgetId);
                }).finally(() => {
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.textContent = 'Send OTP';
                });
        });
    }
    
    if(verifyOtpBtn) {
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
