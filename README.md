# CALTRC

## Project Definition (M0)

- **Project name:** CALTRC
- **Primary user:** People who want to track calories and improve their health.
- **Problem statement (1 sentence):** People struggle to track calories consistently because logging food is annoying and time-consuming.

### Primary Workflow (3–5 steps)
1. User signs up for the app.
2. User completes a short survey to establish a health goal.
3. The app creates a custom health plan based on the survey.
4. User scans barcodes of food they eat.
5. The app pulls food macros and updates the daily goal automatically.

### MVP Scope (max 3 features)
1. Introductory survey to obtain health goals of the user.
2. Food and meal macro inputting and storage.
3. Tailoring daily food goals based on survey results.

### Out of Scope
- Live food analysis from a picture.
- Social features or sharing.
- Medical advice or diagnosis.
- Payment or subscription features.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/BigBackScanner.git
   cd BigBackScanner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

4. Run tests:
   ```bash
   npm test
   ```

---

## Project Structure

```
/src        # Application source code
/tests      # Test files
README.md   # Project documentation
TEAM.md     # Team norms and roles
.gitignore  # Git ignore rules
```

---

## Contribution Workflow

### Branch Naming Convention
- `feature/<description>` — for new features (e.g., `feature/user-survey`)
- `fix/<description>` — for bug fixes (e.g., `fix/login-validation`)

### Pull Request Rules
| Rule | Description |
|------|-------------|
| **No direct pushes** | All changes go through Pull Requests—no commits directly to `main` |
| **No self-merging** | You cannot approve or merge your own Pull Request |
| **Reviewer approval** | At least 1 teammate must approve before merge |
| **Link to issue** | Every Pull Request must reference a GitHub issue (e.g., `Closes #12`) |

### Definition of Done (DoD)
A Pull Request is ready to merge when:
- [ ] Code builds and runs locally without errors
- [ ] All tests pass (even if minimal)
- [ ] README updated if behavior or setup changed
- [ ] Linked issue acceptance criteria are met

---

## GitHub Issues

### MVP Features
| Issue | Owner |
|-------|-------|
| [Feature] Introductory survey for user health goals | Jaron |
| [Feature] Food macro input and storage | Eric |
| [Feature] Daily calorie goal adjustment | Shafi |

### Engineering Baseline
| Issue | Owner |
|-------|-------|
| [Engineering] Repo scaffold and README run instructions | Shafi |
| [Engineering] Basic test setup | Ceren |

### UI/Data Scaffold
| Issue | Owner |
|-------|-------|
| [Scaffold] Sample food database for testing | Jaron |

### Run/Deployment
| Issue | Owner |
|-------|-------|
| [Run] Verify clean install and run steps | Eric |

### Risk
| Issue | Owner |
|-------|-------|
| [Risk] Barcode macro accuracy and API reliability | Ceren |

### Acceptance Criteria Example
```
Acceptance Criteria:
- Survey asks at least 3 health questions.
- User can submit survey.
- Survey data is saved.
```

---

## License

See [LICENSE](LICENSE) for details.
