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
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const surveyHelp = document.getElementById('survey-help');
    const surveyModalTitle = document.getElementById('survey-modal-title');

    let searchTimer = null;
    let surveyEditMode = false;  // tracks create vs edit mode for the survey modal

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
        setupEditProfile();

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
                body: JSON.stringify({ ...food, date: logDate.value }),
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
            await loadGoals(logDate.value);
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
            loadGoals(logDate.value);
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
            <th></th>
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
          <td>
            <button class="btn-delete-entry" data-entry-id="${esc(e.id)}" aria-label="Delete ${esc(e.name)}" title="Delete entry">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </td>
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
          <td></td>
        </tr>
        </tbody>
      </table>
    `;

        logContent.innerHTML = html;

        // Attach delete handlers
        logContent.querySelectorAll('.btn-delete-entry').forEach((btn) => {
            btn.addEventListener('click', () => {
                const entryId = btn.dataset.entryId;
                const entryName = btn.closest('tr').querySelector('td').textContent;
                deleteEntry(entryId, entryName);
            });
        });
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
                { questionId: 'heightFeet', value: Number(document.getElementById('survey-height-feet').value) || '' },
                { questionId: 'heightInches', value: Number(document.getElementById('survey-height-inches').value) || '' },
                { questionId: 'weightLbs', value: Number(document.getElementById('survey-weight-lbs').value) || '' },
                { questionId: 'activityLevel', value: document.getElementById('survey-activity').value || '' },
            ];

            try {
                const token = localStorage.getItem('caltrc_token');
                const method = surveyEditMode ? 'PUT' : 'POST';
                const res = await fetch('/api/survey', {
                    method,
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
                surveyEditMode = false;
                await loadGoals(logDate.value);
                showToast(method === 'PUT' ? 'Profile updated!' : 'Profile saved! Your goals are ready.', 'success');
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
                surveyEditMode = false;
                showSurveyModal();
                return;
            }

            // Any other non-OK response (server error etc.) — show modal so user isn't stuck
            if (!res.ok) {
                surveyEditMode = false;
                showSurveyModal();
                return;
            }

            const data = await res.json();
            const answers = data.survey?.answers || [];
            const byId = Object.fromEntries(answers.map((a) => [a.questionId, a.value]));

            document.getElementById('survey-age').value = byId.age || '';
            document.getElementById('survey-height-feet').value = byId.heightFeet || '';
            document.getElementById('survey-height-inches').value = byId.heightInches || '';
            document.getElementById('survey-weight-lbs').value = byId.weightLbs || '';
            document.getElementById('survey-activity').value = byId.activityLevel || 'moderate';

            hideSurveyModal();

            // Show the edit profile button since survey exists
            if (editProfileBtn) editProfileBtn.style.display = '';
        } catch {
            // Network failure — show the modal so user can still complete their profile
            surveyEditMode = false;
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

    // Prevent the modal from being dismissed by clicking the backdrop or pressing Escape
    // when in create mode. In edit mode, allow dismissal.
    function setupModalGuard() {
        if (!surveyModal) return;

        // Block backdrop clicks from closing in create mode
        surveyModal.addEventListener('click', (e) => {
            if (e.target === surveyModal) {
                if (surveyEditMode) {
                    // In edit mode, allow closing
                    hideSurveyModal();
                    surveyEditMode = false;
                } else {
                    // Shake the modal to hint it must be completed
                    const modal = surveyModal.querySelector('.modal');
                    if (modal) {
                        modal.classList.add('modal-shake');
                        setTimeout(() => modal.classList.remove('modal-shake'), 400);
                    }
                }
            }
        });

        // Block Escape key in create mode only
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !surveyModal.classList.contains('hidden')) {
                if (surveyEditMode) {
                    hideSurveyModal();
                    surveyEditMode = false;
                } else {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            }
        }, true);
    }

    function setupEditProfile() {
        if (!editProfileBtn) return;
        editProfileBtn.addEventListener('click', () => {
            surveyEditMode = true;
            if (surveyModalTitle) surveyModalTitle.textContent = 'Edit your health profile';
            if (surveyHelp) surveyHelp.textContent = 'Update your info below to recalculate your daily targets.';
            if (surveySubmitBtn) {
                surveySubmitBtn.querySelector('.btn-text').textContent = 'Save changes';
            }
            showSurveyModal();
        });
    }

    async function loadGoals(date) {
        if (!goalContent) return;
        const targetDate = date || new Date().toISOString().split('T')[0];
        goalContent.innerHTML = '<div class="log-empty">Loading goals...</div>';

        try {
            const token = localStorage.getItem('caltrc_token');
            const res = await fetch(`/api/goals/today?date=${targetDate}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (!res.ok) {
                goalContent.innerHTML = '<div class="log-empty">Complete survey to see goals</div>';
                return;
            }

            const goal = data.goal;
            const consumed = data.consumed;

            // Ring chart helper
            const RADIUS = 36;
            const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

            function buildRing(label, current, target, cssClass, unit) {
                const pct = target > 0 ? Math.min(current / target, 1.5) : 0;
                const displayPct = Math.round(pct * 100);
                const offset = CIRCUMFERENCE - (Math.min(pct, 1) * CIRCUMFERENCE);
                const isOver = current > target;
                const fillClass = isOver ? `${cssClass} ring-over` : cssClass;
                const currentDisplay = unit === 'cal' ? Math.round(current) : current.toFixed(1);
                const targetDisplay = unit === 'cal' ? target : target;

                return `
                  <div class="goal-ring-card">
                    <div class="goal-ring-svg">
                      <svg viewBox="0 0 90 90">
                        <circle class="goal-ring-track" cx="45" cy="45" r="${RADIUS}" />
                        <circle class="goal-ring-fill ${fillClass}"
                          cx="45" cy="45" r="${RADIUS}"
                          stroke-dasharray="${CIRCUMFERENCE}"
                          stroke-dashoffset="${CIRCUMFERENCE}"
                          data-target-offset="${offset}" />
                      </svg>
                      <div class="goal-ring-center">
                        <span class="goal-ring-percent" data-target-pct="${displayPct}">0%</span>
                        <span class="goal-ring-unit">${unit}</span>
                      </div>
                    </div>
                    <span class="goal-ring-label">${label}</span>
                    <span class="goal-ring-detail">${currentDisplay} / ${targetDisplay}${unit === 'cal' ? '' : 'g'}</span>
                  </div>
                `;
            }

            // Calorie summary bar
            const calPct = goal.calorieTarget > 0 ? (consumed.calories / goal.calorieTarget) : 0;
            const calBarWidth = Math.min(calPct * 100, 100);
            const calIsOver = consumed.calories > goal.calorieTarget;

            let html = `
              <div class="goal-summary-bar">
                <div class="goal-summary-label">
                  <strong>Calories</strong>
                  <span>${Math.round(consumed.calories)} / ${goal.calorieTarget} kcal</span>
                </div>
                <div class="goal-bar-track">
                  <div class="goal-bar-fill ${calIsOver ? 'over-target' : ''}" style="width: 0%" data-target-width="${calBarWidth}%"></div>
                </div>
              </div>
            `;

            // Ring charts
            html += '<div class="goal-rings-grid">';
            html += buildRing('Calories', consumed.calories, goal.calorieTarget, 'ring-calories', 'cal');
            html += buildRing('Protein', consumed.protein, goal.proteinTarget, 'ring-protein', 'g');
            html += buildRing('Carbs', consumed.carbs, goal.carbTarget, 'ring-carbs', 'g');
            html += buildRing('Fat', consumed.fat, goal.fatTarget, 'ring-fat', 'g');
            html += '</div>';

            goalContent.innerHTML = html;

            // Number animation helper
            function animateValue(obj, start, end, duration) {
                let startTimestamp = null;
                const step = (timestamp) => {
                    if (!startTimestamp) startTimestamp = timestamp;
                    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                    // easeOutQuart
                    const easeProgress = 1 - Math.pow(1 - progress, 4);
                    obj.textContent = Math.floor(easeProgress * (end - start) + start) + '%';
                    if (progress < 1) {
                        window.requestAnimationFrame(step);
                    } else {
                        obj.textContent = end + '%';
                    }
                };
                window.requestAnimationFrame(step);
            }

            // Use a small delay to guarantee the browser has painted the initial
            // stroke-dashoffset (CIRCUMFERENCE = fully empty) before we set the
            // target offset, so the CSS transition fires correctly every time
            // (including when switching dates and the DOM is rebuilt).
            setTimeout(() => {
                // Animate bar
                const barFill = goalContent.querySelector('.goal-bar-fill');
                if (barFill) {
                    barFill.style.width = barFill.dataset.targetWidth;
                }
                // Animate rings
                goalContent.querySelectorAll('.goal-ring-fill').forEach((ring) => {
                    ring.style.strokeDashoffset = ring.dataset.targetOffset;
                });
                // Animate numbers
                goalContent.querySelectorAll('.goal-ring-percent').forEach((el) => {
                    const target = parseInt(el.dataset.targetPct, 10);
                    animateValue(el, 0, target, 1500);
                });
            }, 50);

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

    async function deleteEntry(entryId, entryName) {
        if (!confirm(`Delete "${entryName}"?`)) return;

        try {
            const token = localStorage.getItem('caltrc_token');
            const res = await fetch(`/api/log/${encodeURIComponent(entryId)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete');
            }

            showToast('Entry deleted', 'success');
            await loadLog(logDate.value);
            await loadGoals(logDate.value);
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
