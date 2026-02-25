/**
 * CALTRC — Auth Page Logic
 */
(function () {
    'use strict';

    // If already logged in, go to dashboard
    if (localStorage.getItem('caltrc_token')) {
        window.location.href = '/';
        return;
    }

    // --- DOM refs ---
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    const loginSubmit = document.getElementById('login-submit');
    const signupSubmit = document.getElementById('signup-submit');
    const toastContainer = document.getElementById('toast-container');

    // --- Tabs ---
    document.querySelectorAll('.auth-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            // Update tabs
            document.querySelectorAll('.auth-tab').forEach((t) => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            // Update forms
            document.querySelectorAll('.auth-form').forEach((f) => f.classList.remove('active'));
            const target = tab.dataset.tab === 'login' ? loginForm : signupForm;
            target.classList.add('active');

            // Clear errors
            loginError.hidden = true;
            signupError.hidden = true;
        });
    });

    // --- Login ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.hidden = true;

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            showError(loginError, 'Please fill in all fields');
            return;
        }

        setLoading(loginSubmit, true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                showError(loginError, data.error || 'Login failed');
                return;
            }

            localStorage.setItem('caltrc_token', data.token);
            localStorage.setItem('caltrc_user', JSON.stringify(data.user));
            window.location.href = '/';
        } catch {
            showError(loginError, 'Network error — please try again');
        } finally {
            setLoading(loginSubmit, false);
        }
    });

    // --- Sign Up ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupError.hidden = true;

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        if (!name || !email || !password || !confirm) {
            showError(signupError, 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            showError(signupError, 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirm) {
            showError(signupError, 'Passwords do not match');
            return;
        }

        setLoading(signupSubmit, true);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                showError(signupError, data.error || 'Signup failed');
                return;
            }

            localStorage.setItem('caltrc_token', data.token);
            localStorage.setItem('caltrc_user', JSON.stringify(data.user));
            window.location.href = '/';
        } catch {
            showError(signupError, 'Network error — please try again');
        } finally {
            setLoading(signupSubmit, false);
        }
    });

    // --- Helpers ---
    function showError(el, msg) {
        el.textContent = msg;
        el.hidden = false;
    }

    function setLoading(btn, loading) {
        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type || ''}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('visible');
            });
        });

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 200);
        }, 2500);
    }
})();
