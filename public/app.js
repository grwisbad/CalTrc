/**
 * CALTRC — Client-side Application
 */

(function () {
    'use strict';

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
    const surveyForm = document.getElementById('survey-form');
    const surveyStatus = document.getElementById('survey-status');
    const surveyModal = document.getElementById('survey-modal-backdrop');
    const surveySubmitBtn = document.getElementById('survey-submit');
    const goalContent = document.getElementById('goal-content');

    let searchTimer = null;

    function init() {
        const token = localStorage.getItem('caltrc_token');
        if (!token) {
            window.location.href = '/auth.html';
            return;
        }

        const greeting = document.getElementById('user-greeting');
        try {
            const user = JSON.parse(localStorage.getItem('caltrc_user'));
            if (user && user.name) greeting.textContent = `Welcome back, ${user.name}`;
        } catch {
            // ignore
        }

        document.getElementById('logout-btn').addEventListener('click', async () => {
            const token = localStorage.getItem('caltrc_token');
            if (token) {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch {
                    // even if network fails, we clear local state
                }
            }
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
        setupSurveyForm();
        setupModalGuard();

        loadSurveyAndMaybePrompt();
        loadGoals();
        loadLog(today);
    }

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

        searchResults.innerHTML = `
      <div class="search-results" style="padding: var(--sp-3) var(--sp-4);">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    `;

        try {
            const token = localStorage.getItem('caltrc_token');
            const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
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

        searchResults.querySelectorAll('.search-result').forEach((el) => {
            el.addEventListener('click', () => {
                const food = JSON.parse(el.dataset.food);
                addEntry(food);
            });
        });
    }

    function setupManualForm() {
        manualForm.addEventListener('submit', (e) => {
            e.preventDefault();

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

    async function addEntry(food) {
        manualSubmit.classList.add('loading');
        manualSubmit.disabled = true;

        try {
            const token = localStorage.getItem('caltrc_token');
            const res = await fetch('/api/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
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

            await loadLog(logDate.value);
            await loadGoals();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            manualSubmit.classList.remove('loading');
            manualSubmit.disabled = false;
        }
    }

    function setupDateNav() {
        logDate.addEventListener('change', () => {
            loadLog(logDate.value);
        });
    }

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
            const token = localStorage.getItem('caltrc_token');
            const res = await fetch(`/api/log?date=${date}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
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

    function setupSurveyForm() {
        if (!surveyForm) return;
        surveyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            surveyStatus.textContent = '';

            if (surveySubmitBtn) {
                surveySubmitBtn.classList.add('loading');
                surveySubmitBtn.disabled = true;
            }

            const answers = [
                { questionId: 'age', value: Number(document.getElementById('survey-age').value) || '' },
                { questionId: 'heightCm', value: Number(document.getElementById('survey-height').value) || '' },
                { questionId: 'weight', value: Number(document.getElementById('survey-weight').value) || '' },
                { questionId: 'biologicalSex', value: document.getElementById('survey-sex').value || '' },
                { questionId: 'activityLevel', value: document.getElementById('survey-activity').value || '' },
                { questionId: 'goalPace', value: document.getElementById('survey-goal-pace').value || '' },
            ];

            try {
                const token = localStorage.getItem('caltrc_token');
                const res = await fetch('/api/survey', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ answers }),
                });

                const data = await res.json();
                if (!res.ok) {
                    surveyStatus.textContent = data.errors ? data.errors.join(' | ') : (data.error || 'Failed to save survey');
                    return;
                }

                hideSurveyModal();
                await loadGoals();
                showToast('Profile saved! Your goals are ready.', 'success');
            } catch {
                surveyStatus.textContent = 'Network error — please try again';
            } finally {
                if (surveySubmitBtn) {
                    surveySubmitBtn.classList.remove('loading');
                    surveySubmitBtn.disabled = false;
                }
            }
        });
    }

    async function loadSurveyAndMaybePrompt() {
        if (!surveyForm) return;
        try {
            const token = localStorage.getItem('caltrc_token');
            const res = await fetch('/api/survey', {
                headers: { Authorization: `Bearer ${token}` },
            });

            // No survey yet — show the modal (covers new users AND existing users who skipped)
            if (res.status === 404) {
                showSurveyModal();
                return;
            }

            // Any other non-OK response (server error etc.) — show modal so user isn't stuck
            if (!res.ok) {
                showSurveyModal();
                return;
            }

            const data = await res.json();
            const answers = data.survey?.answers || [];
            const byId = Object.fromEntries(answers.map((a) => [a.questionId, a.value]));

            document.getElementById('survey-age').value = byId.age || '';
            document.getElementById('survey-height').value = byId.heightCm || '';
            document.getElementById('survey-weight').value = byId.weight || '';
            document.getElementById('survey-sex').value = byId.biologicalSex || 'male';
            document.getElementById('survey-activity').value = byId.activityLevel || 'moderate';
            document.getElementById('survey-goal-pace').value = byId.goalPace || 'maintain';

            hideSurveyModal();
        } catch {
            // Network failure — show the modal so user can still complete their profile
            showSurveyModal();
        }
    }

    function showSurveyModal() {
        if (!surveyModal) return;
        surveyModal.classList.remove('hidden');
        surveyModal.setAttribute('aria-hidden', 'false');
    }

    function hideSurveyModal() {
        if (!surveyModal) return;
        surveyModal.classList.add('hidden');
        surveyModal.setAttribute('aria-hidden', 'true');
    }

    // Prevent the modal from being dismissed by clicking the backdrop or pressing Escape.
    // The survey is required — users must complete it to get personalized goals.
    function setupModalGuard() {
        if (!surveyModal) return;

        // Block backdrop clicks from closing
        surveyModal.addEventListener('click', (e) => {
            if (e.target === surveyModal) {
                // Shake the modal to hint it must be completed
                const modal = surveyModal.querySelector('.modal');
                if (modal) {
                    modal.classList.add('modal-shake');
                    setTimeout(() => modal.classList.remove('modal-shake'), 400);
                }
            }
        });

        // Block Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !surveyModal.classList.contains('hidden')) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }, true);
    }

    async function loadGoals() {
        if (!goalContent) return;
        goalContent.innerHTML = '<div class="log-empty">Loading goals...</div>';

        try {
            const token = localStorage.getItem('caltrc_token');
            const res = await fetch('/api/goals/today', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (!res.ok) {
                goalContent.innerHTML = '<div class="log-empty">Complete survey to see goals</div>';
                return;
            }

            const goal = data.goal;
            const consumed = data.consumed;
            goalContent.innerHTML = `
              <div class="goal-grid">
                <div class="goal-card"><strong>Calories</strong><span>${consumed.calories} / ${goal.calorieTarget}</span></div>
                <div class="goal-card"><strong>Protein</strong><span>${consumed.protein.toFixed(1)}g / ${goal.proteinTarget}g</span></div>
                <div class="goal-card"><strong>Carbs</strong><span>${consumed.carbs.toFixed(1)}g / ${goal.carbTarget}g</span></div>
                <div class="goal-card"><strong>Fat</strong><span>${consumed.fat.toFixed(1)}g / ${goal.fatTarget}g</span></div>
              </div>
            `;
        } catch {
            goalContent.innerHTML = '<div class="log-empty">Failed to load goals</div>';
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

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
