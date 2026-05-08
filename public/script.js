function toggleAuth() {
    document.getElementById('signin-section').classList.toggle('hidden');
    document.getElementById('signup-section').classList.toggle('hidden');
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
        const post = await fetch("/users/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, email: email, password: password }),
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
    }
});