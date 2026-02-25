/**
 * CALTRC — Client-side Application
 */

(function () {
    'use strict';

    // --- DOM refs ---
    const searchInput = document.getElementById('food-search');
    const searchStatus = document.getElementById('search-status');
    const searchResults = document.getElementById('search-results');
    const manualForm = document.getElementById('manual-form');
    const manualSubmit = document.getElementById('manual-submit');
    const nameInput = document.getElementById('manual-name');
    const nameError = document.getElementById('name-error');
    const logDate = document.getElementById('log-date');
    const logContent = document.getElementById('log-content');
    const toastContainer = document.getElementById('toast-container');

    // --- State ---
    let searchTimer = null;

    // --- Init ---
    function init() {
        // Auth gate — redirect if not logged in
        const token = localStorage.getItem('caltrc_token');
        if (!token) {
            window.location.href = '/auth.html';
            return;
        }

        // Personalized greeting
        const greeting = document.getElementById('user-greeting');
        try {
            const user = JSON.parse(localStorage.getItem('caltrc_user'));
            if (user && user.name) {
                greeting.textContent = `Welcome back, ${user.name}`;
            }
        } catch { /* ignore */ }

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('caltrc_token');
            localStorage.removeItem('caltrc_user');
            window.location.href = '/auth.html';
        });

        const today = new Date().toISOString().split('T')[0];
        logDate.value = today;

        setupTabs();
        setupSearch();
        setupManualForm();
        setupDateNav();
        loadLog(today);
    }

    // --- Tabs ---
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                const panel = document.getElementById('panel-' + tab.dataset.tab);
                if (panel) panel.classList.add('active');
            });
        });
    }

    // --- USDA Search ---
    function setupSearch() {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            const q = searchInput.value.trim();

            if (q.length < 2) {
                searchResults.innerHTML = '';
                searchStatus.textContent = '';
                return;
            }

            searchStatus.textContent = '...';
            searchTimer = setTimeout(() => performSearch(q), 300);
        });
    }

    async function performSearch(query) {
        searchStatus.textContent = 'Searching';

        // Show skeleton
        searchResults.innerHTML = `
      <div class="search-results" style="padding: var(--sp-3) var(--sp-4);">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    `;

        try {
            const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                searchResults.innerHTML = '<div class="log-empty">No results found</div>';
                searchStatus.textContent = '';
                return;
            }

            searchStatus.textContent = data.results.length + ' found';
            renderSearchResults(data.results);
        } catch {
            searchResults.innerHTML = '<div class="log-empty">Search failed</div>';
            searchStatus.textContent = '';
        }
    }

    function renderSearchResults(results) {
        let html = '<div class="search-results">';
        for (const food of results) {
            html += `
        <div class="search-result" data-food='${escapeAttr(JSON.stringify(food))}'>
          <div>
            <div class="search-result-name">${esc(food.name)}</div>
            ${food.brand ? `<div class="search-result-brand">${esc(food.brand)}</div>` : ''}
          </div>
          <div class="search-result-macros">
            <span>${food.calories} cal</span>
            <span>${food.protein}p</span>
            <span>${food.carbs}c</span>
            <span>${food.fat}f</span>
          </div>
        </div>
      `;
        }
        html += '</div>';
        searchResults.innerHTML = html;

        // Attach click handlers
        searchResults.querySelectorAll('.search-result').forEach((el) => {
            el.addEventListener('click', () => {
                const food = JSON.parse(el.dataset.food);
                addEntry(food);
            });
        });
    }

    // --- Manual Form ---
    function setupManualForm() {
        manualForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Validate
            const name = nameInput.value.trim();
            if (!name) {
                nameInput.classList.add('input-error');
                nameError.hidden = false;
                return;
            }
            nameInput.classList.remove('input-error');
            nameError.hidden = true;

            const food = {
                name,
                calories: Number(document.getElementById('manual-cal').value) || 0,
                protein: Number(document.getElementById('manual-protein').value) || 0,
                carbs: Number(document.getElementById('manual-carbs').value) || 0,
                fat: Number(document.getElementById('manual-fat').value) || 0,
            };

            addEntry(food);
        });

        nameInput.addEventListener('input', () => {
            if (nameInput.value.trim()) {
                nameInput.classList.remove('input-error');
                nameError.hidden = true;
            }
        });
    }

    // --- Add entry ---
    async function addEntry(food) {
        manualSubmit.classList.add('loading');
        manualSubmit.disabled = true;

        try {
            const res = await fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(food),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            showToast('Entry added', 'success');
            manualForm.reset();
            searchInput.value = '';
            searchResults.innerHTML = '';
            searchStatus.textContent = '';

            // Reload today's log
            loadLog(logDate.value);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            manualSubmit.classList.remove('loading');
            manualSubmit.disabled = false;
        }
    }

    // --- Date Nav ---
    function setupDateNav() {
        logDate.addEventListener('change', () => {
            loadLog(logDate.value);
        });
    }

    // --- Load Log ---
    async function loadLog(date) {
        logContent.innerHTML = `
      <div style="padding: var(--sp-4);">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    `;

        try {
            const res = await fetch(`/api/log?date=${date}`);
            const data = await res.json();
            renderLog(data.entries, data.totals);
        } catch {
            logContent.innerHTML = '<div class="log-empty">Failed to load log</div>';
        }
    }

    function renderLog(entries, totals) {
        if (!entries || entries.length === 0) {
            logContent.innerHTML = '<div class="log-empty">No entries for this day</div>';
            return;
        }

        let html = `
      <table class="log-table">
        <thead>
          <tr>
            <th>Food</th>
            <th>Cal</th>
            <th>Protein</th>
            <th>Carbs</th>
            <th>Fat</th>
          </tr>
        </thead>
        <tbody>
    `;

        for (const e of entries) {
            html += `
        <tr>
          <td>${esc(e.name)}</td>
          <td>${e.calories}</td>
          <td>${e.protein}g</td>
          <td>${e.carbs}g</td>
          <td>${e.fat}g</td>
        </tr>
      `;
        }

        html += `
        <tr class="totals-row">
          <td>Total</td>
          <td>${totals.calories}</td>
          <td>${totals.protein}g</td>
          <td>${totals.carbs}g</td>
          <td>${totals.fat}g</td>
        </tr>
        </tbody>
      </table>
    `;

        logContent.innerHTML = html;
    }

    // --- Toast ---
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

    // --- Utils ---
    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }

    // --- Boot ---
    document.addEventListener('DOMContentLoaded', init);
})();
