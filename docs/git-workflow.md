# Git workflow

The stable application is `main`. Day-to-day integration is `develop`. Feature work uses a branch and is merged back with a merge commit so the history shows where it came from.

Suggested branches:

- `feature/authentication`
- `feature/puzzle-engine`
- `feature/leaderboard`
- `feature/event-system`
- `feature/api-integration`

## Windows commands

Run these from the project directory in PowerShell. Do not commit `server/.env`.

```powershell
git status
git checkout main
git checkout -b develop

git checkout -b feature/authentication
# edit files
git add server/src/models/User.js server/src/services/auth.service.js
git commit -m "feat: implement user authentication"

git checkout develop
git merge --no-ff feature/authentication -m "merge: authentication into develop"

git checkout -b feature/api-integration
git add server/src/services/banana
git commit -m "feat: integrate Banana API"

git checkout develop
git merge --no-ff feature/api-integration -m "merge: Banana API adapter into develop"

git checkout -b feature/puzzle-engine
git add server/src/services/game.service.js server/src/services/scoring
git commit -m "feat: add puzzle submission and scoring"

git checkout develop
git merge --no-ff feature/puzzle-engine -m "merge: puzzle engine into develop"

git checkout -b feature/event-system
git add server/src/events
git commit -m "feat: implement event-driven game updates"

git checkout develop
git merge --no-ff feature/event-system -m "merge: event system into develop"

git checkout -b feature/leaderboard
git add server/src/services/leaderboard.service.js
git commit -m "feat: rank players from stored scores"

git checkout develop
git merge --no-ff feature/leaderboard -m "merge: leaderboard into develop"

git checkout main
git merge --no-ff develop -m "merge: develop into main"
```

Useful checks before a merge:

```powershell
git status
git diff
git log --oneline --decorate --graph --all
```

Commit subjects used in this project:

- `feat: implement user authentication`
- `feat: add puzzle submission and scoring`
- `feat: integrate Banana API`
- `feat: implement event-driven game updates`
- `feat: rank players from stored scores`
- `feat: add the game client`
- `test: add answer validation tests`
- `docs: add architecture and setup guide`

## Publishing

This repository does not assume a GitHub remote. Add one only when you have created the empty repository, then push:

```powershell
git remote add origin https://github.com/<your-account>/<your-repo>.git
git push -u origin main
git push -u origin develop
```

Do not force-push `main`. Do not commit `.env`, cookies, password hashes, or database dumps.

If `git remote -v` prints nothing, the project is local only. That is an honest state: the commands above are ready, and nothing has been published.
