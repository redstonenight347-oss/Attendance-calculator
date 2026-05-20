function toggleAuth() {
    document.getElementById('signin-section').classList.toggle('hidden');
    document.getElementById('signup-section').classList.toggle('hidden');
    
    // Reset signup step display states
    const step1 = document.getElementById('signup-step-1');
    const step2 = document.getElementById('signup-step-2');
    if (step1 && step2) {
        step1.style.display = 'block';
        step2.style.display = 'none';
    }
    const output = document.getElementById('signup-output');
    if (output) output.textContent = '';
}

const statusMessages = [
    "Waking up the server...",
    "Finding your account...",
    "Verifying credentials...",
    "Almost there...",
    "Establishing secure connection...",
    "Fetching your data...",
    "Preparing your dashboard..."
];

function startStatusRotation(btn, originalText) {
    let index = 0;
    btn.innerText = statusMessages[index];
    const interval = setInterval(() => {
        index = (index + 1) % statusMessages.length;
        if (btn.disabled) {
            btn.innerText = statusMessages[index];
        } else {
            clearInterval(interval);
        }
    }, 2000);
    return interval;
}

async function signinRequest() {
    const email = document.querySelector("#signin-email").value.trim();
    const password = document.querySelector("#signin-password").value.trim();
    const output = document.querySelector("#signin-output");
    const btn = document.getElementById("signin-btn");

    output.textContent = "";

    if (!email || !password) {
        output.innerHTML = `<p class="error-text">Email and password are required.</p>`;
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    const interval = startStatusRotation(btn, originalText);

    try {
        const post = await fetch("/users/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password }),
        });

        const response = await post.json();
        
        if (!post.ok) {
            output.innerHTML = `<p class="error-text">${response.message}</p>`;
        } else {
            // Save token and userId for session management
            localStorage.setItem("token", response.token);
            localStorage.setItem("userId", response.userId);

            output.innerHTML = `<p>${response.message} Redirecting...</p>`;
            setTimeout(() => {
                window.location.href = `/dashboard.html`;
            }, 1000);
        }
        console.log(response);
    }
    catch (err) {
        console.log("frontend catch")
        output.innerHTML = `<p class="error-text">An error occurred.</p>`;
    } finally {
        clearInterval(interval);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function signupRequest() {
    const name = document.querySelector("#signup-name").value.trim();
    const email = document.querySelector("#signup-email").value.trim();
    const password = document.querySelector("#signup-password").value.trim();
    const output = document.querySelector("#signup-output");
    const btn = document.getElementById("signup-btn");

    output.textContent = "";

    if (!name || !email || !password) {
        output.innerHTML = `<p class="error-text">Name, email, and password are required.</p>`;
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        output.innerHTML = `<p class="error-text">Please enter a valid email address.</p>`;
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    const interval = startStatusRotation(btn, originalText);

    try {
        const post = await fetch("/users/signup/otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email, password: password }),
        });

        const response = await post.json();

        if (!post.ok) {
            output.innerHTML = `<p class="error-text">${response.message}</p>`;
        } else {
            // Go to Step 2
            document.getElementById('signup-step-1').style.display = 'none';
            document.getElementById('signup-step-2').style.display = 'block';
            const otpInput = document.getElementById('signup-otp-input');
            if (otpInput) otpInput.focus();
            output.innerHTML = `<p style="color: #4ade80;">${response.message}</p>`;
        }
    }
    catch (err) {
        console.log("frontend catch");
        output.innerHTML = `<p class="error-text">An error occurred while sending OTP.</p>`;
    } finally {
        clearInterval(interval);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function signupVerifyRequest() {
    const name = document.querySelector("#signup-name").value.trim();
    const email = document.querySelector("#signup-email").value.trim();
    const password = document.querySelector("#signup-password").value.trim();
    const otp = document.getElementById("signup-otp-input").value.trim();
    const output = document.querySelector("#signup-output");
    const btn = document.getElementById("signup-verify-btn");

    output.textContent = "";

    if (!otp) {
        output.innerHTML = `<p class="error-text">Please enter the 6-digit OTP code.</p>`;
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    const interval = startStatusRotation(btn, originalText);

    try {
        const post = await fetch("/users/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, otp }),
        });

        const response = await post.json();

        if (!post.ok) {
            output.innerHTML = `<p class="error-text">${response.message}</p>`;
        } else {
            // Save token and userId for session management
            localStorage.setItem("token", response.token);
            localStorage.setItem("userId", response.userId);

            output.innerHTML = `<p style="color: #4ade80;">${response.message} Redirecting...</p>`;
            setTimeout(() => {
                window.location.href = `/dashboard.html`;
            }, 1000);
        }
    }
    catch (err) {
        output.innerHTML = `<p class="error-text">An error occurred during verification.</p>`;
    } finally {
        clearInterval(interval);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// Theme initialization
function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.body.classList.add('dark-theme');
        toggle.checked = true;
    }

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Check for existing session on load
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    
    if (token && userId) {
        window.location.href = "/dashboard.html";
        return;
    }

    // Bind sign in / sign up toggle links
    document.querySelectorAll('.auth-toggle-link').forEach(link => {
        link.addEventListener('click', toggleAuth);
    });

    // Bind forgot password links
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) forgotLink.addEventListener('click', showForgotPassword);

    const backToSigninLink = document.getElementById('back-to-signin-link');
    if (backToSigninLink) backToSigninLink.addEventListener('click', hideForgotPassword);

    // Bind action buttons
    const signinBtn = document.getElementById('signin-btn');
    if (signinBtn) signinBtn.addEventListener('click', signinRequest);

    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) signupBtn.addEventListener('click', signupRequest);

    const signupVerifyBtn = document.getElementById('signup-verify-btn');
    if (signupVerifyBtn) signupVerifyBtn.addEventListener('click', signupVerifyRequest);

    const signupBackLink = document.getElementById('signup-back-link');
    if (signupBackLink) {
        signupBackLink.addEventListener('click', () => {
            document.getElementById('signup-step-1').style.display = 'block';
            document.getElementById('signup-step-2').style.display = 'none';
            document.getElementById('signup-output').textContent = '';
        });
    }

    const forgotOtpBtn = document.getElementById('forgot-otp-btn');
    if (forgotOtpBtn) forgotOtpBtn.addEventListener('click', requestForgotPasswordOTP);

    const forgotResetBtn = document.getElementById('forgot-reset-btn');
    if (forgotResetBtn) forgotResetBtn.addEventListener('click', resetPasswordWithOTP);

    // Bind password visibility toggles
    const signinToggle = document.getElementById('signin-password-toggle');
    if (signinToggle) {
        signinToggle.addEventListener('click', (e) => {
            togglePasswordVisibility('signin-password', signinToggle);
        });
    }

    const signupToggle = document.getElementById('signup-password-toggle');
    if (signupToggle) {
        signupToggle.addEventListener('click', (e) => {
            togglePasswordVisibility('signup-password', signupToggle);
        });
    }

    const forgotNewToggle = document.getElementById('forgot-new-password-toggle');
    if (forgotNewToggle) {
        forgotNewToggle.addEventListener('click', (e) => {
            togglePasswordVisibility('forgot-new-password', forgotNewToggle);
        });
    }

    // Bind input focus behavior to safely transition from text to password type without inline onfocus
    const signinPassInput = document.getElementById('signin-password');
    if (signinPassInput) {
        signinPassInput.addEventListener('focus', function() {
            this.type = 'password';
        });
    }

    const signupPassInput = document.getElementById('signup-password');
    if (signupPassInput) {
        signupPassInput.addEventListener('focus', function() {
            this.type = 'password';
        });
    }

    const forgotPassInput = document.getElementById('forgot-new-password');
    if (forgotPassInput) {
        forgotPassInput.addEventListener('focus', function() {
            this.type = 'password';
        });
    }
});

function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === "password") {
            input.type = "text";
            icon.textContent = "🙈";
        } else {
            input.type = "password";
            icon.textContent = "👁️";
        }
    }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function showForgotPassword() {
    document.getElementById('signin-section').classList.add('hidden');
    document.getElementById('signup-section').classList.add('hidden');
    document.getElementById('forgot-password-section').classList.remove('hidden');
    
    // Reset view
    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('forgot-output').textContent = '';
    document.getElementById('forgot-email').value = '';
}

function hideForgotPassword() {
    document.getElementById('forgot-password-section').classList.add('hidden');
    document.getElementById('signin-section').classList.remove('hidden');
}

async function requestForgotPasswordOTP() {
    const email = document.getElementById('forgot-email').value.trim();
    const btn = document.getElementById('forgot-otp-btn');
    const output = document.getElementById('forgot-output');
    
    output.textContent = '';
    
    if (!email) {
        output.innerHTML = `<p class="error-text">Email ID is required.</p>`;
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        output.innerHTML = `<p class="error-text">Please enter a valid email address.</p>`;
        return;
    }
    
    const originalText = btn.innerText;
    btn.disabled = true;
    const interval = startStatusRotation(btn, originalText);
    
    try {
        const res = await fetch("/users/forgot-password/otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            output.innerHTML = `<p class="error-text">${data.message || 'Failed to send OTP'}</p>`;
        } else {
            document.getElementById('forgot-step-1').style.display = 'none';
            document.getElementById('forgot-step-2').style.display = 'block';
            document.getElementById('forgot-otp-input').focus();
        }
    } catch (err) {
        console.error(err);
        output.innerHTML = `<p class="error-text">An error occurred while sending OTP.</p>`;
    } finally {
        clearInterval(interval);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function resetPasswordWithOTP() {
    const email = document.getElementById('forgot-email').value.trim();
    const otp = document.getElementById('forgot-otp-input').value.trim();
    const newPassword = document.getElementById('forgot-new-password').value.trim();
    const btn = document.getElementById('forgot-reset-btn');
    const output = document.getElementById('forgot-output');
    
    output.textContent = '';
    
    if (!otp || !newPassword) {
        output.innerHTML = `<p class="error-text">OTP and new password are required.</p>`;
        return;
    }
    
    if (newPassword.length < 6) {
        output.innerHTML = `<p class="error-text">Password must be at least 6 characters.</p>`;
        return;
    }
    
    const originalText = btn.innerText;
    btn.disabled = true;
    const interval = startStatusRotation(btn, originalText);
    
    try {
        const res = await fetch("/users/forgot-password/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp, newPassword })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            output.innerHTML = `<p class="error-text">${data.message || 'Failed to reset password'}</p>`;
        } else {
            output.innerHTML = `<p style="color: #4ade80;">Password reset successfully! Redirecting to Sign In...</p>`;
            setTimeout(() => {
                hideForgotPassword();
            }, 2000);
        }
    } catch (err) {
        console.error(err);
        output.innerHTML = `<p class="error-text">An error occurred while resetting password.</p>`;
    } finally {
        clearInterval(interval);
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

window.showForgotPassword = showForgotPassword;
window.hideForgotPassword = hideForgotPassword;
window.requestForgotPasswordOTP = requestForgotPasswordOTP;
window.resetPasswordWithOTP = resetPasswordWithOTP;