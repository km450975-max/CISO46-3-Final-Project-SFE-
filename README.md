# Banana Math Puzzle Challenge

Students register, solve banana picture puzzles against a countdown, and keep a score, streak, and leaderboard place. The React client talks to an Express API. Answers are checked on the server and stored in MongoDB. Puzzle images come from the [Banana Game API](https://marcconrad.com/uob/banana/doc.php).

## What is live, and what is simulated

| Piece | Behaviour |
| --- | --- |
| Banana API in `live` mode | Real HTTP call. The response is an image URL plus a numeric solution. The solution stays on the server until the round is saved. |
| Banana API in `mock` mode | Local SVG cards such as `3 + 4 = ?`. The UI labels them as simulated. Tests use this mode. |
| Difficulty, hints, points, streaks | Implemented here. The external API does not provide them. |
| Answer checking | This server compares the submitted integer with the stored solution. The Banana API has no "check my answer" endpoint. |
| Leaderboard and history | Read from MongoDB. There is no sample score data. |
| Real-time multiplayer | Not built. The board updates when it is loaded. |

Set `BANANA_API_MODE=live` for the real pictures. Set it to `mock` when you are offline. Set `BANANA_API_FALLBACK=true` only if a failed live call should be replaced by a labelled mock card.

## Prerequisites

- Node.js 20 or newer
- MongoDB running locally (this project was developed against MongoDB 8 on Windows)
- PowerShell

## Setup on Windows

From the project folder:

```powershell
npm install --prefix server
npm install --prefix client
Copy-Item .env.example server\.env
```

Edit `server/.env`. Replace `JWT_SECRET` with a long random string:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

Optional administrator, created on startup if that email does not exist:

```text
ADMIN_EMAIL=you@school.test
ADMIN_PASSWORD=ChangeMe1
ADMIN_USERNAME=admin
```

Start MongoDB if it is not already running, then use two terminals:

```powershell
npm run dev --prefix server
```

```powershell
npm run dev --prefix client
```

- API: <http://localhost:5000/api/v1/health>
- App: <http://localhost:5173>

Vite proxies `/api` to the API, so the session cookie stays on the same site during development. For a separate production host, set `CLIENT_ORIGIN` and build the client with `VITE_API_URL=https://your-api-host/api/v1`.

## Tests

Tests use an in-memory MongoDB and the mock puzzle adapter. They do not use your `banana_math` database.

```powershell
npm test --prefix server
npm test --prefix client
```

The server tests cover registration, bad passwords, invalid login, protected routes, logout invalidation, roles, puzzle loading without the solution, correct and incorrect answers, streaks, timer expiry, duplicate submissions, practice mode, a finished game, Banana API failure, leaderboard order, and event records.

## Scripts

| Command | Where | What it does |
| --- | --- | --- |
| `npm run dev` | `server` | API with restart on file changes |
| `npm start` | `server` | API once |
| `npm test` | `server` | Vitest |
| `npm run dev` | `client` | Vite |
| `npm run build` | `client` | Production bundle |
| `npm test` | `client` | Formatter tests |
| `npm run postman` | project root | Newman checks for every API route. The API must already be running |

## Application map

Players open the splash screen, then register or log in, and use the dashboard, game, leaderboard, profile, history, and settings. Private pages redirect to login. The admin screen has no menu link. A student who opens `/admin` sees the ordinary not-found page. The API still returns 403 for a signed-in student.

A game can be 3, 4, or 5 rounds, with base points of 10, 20, or 30. Omitting those fields on `POST /games/start` still defaults to 10 rounds and the difficulty's base points. Ranked mode updates the career score. Practice mode does not. Scoring, events, identity, and the HTTP contract are described in:

- [docs/architecture.md](docs/architecture.md)
- [docs/api-documentation.md](docs/api-documentation.md)
- [docs/git-workflow.md](docs/git-workflow.md)

## Environment

See `.env.example`. Never commit `server/.env`.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Application database |
| `JWT_SECRET` | Signs the session cookie |
| `JWT_EXPIRES_IN` | Cookie and token lifetime, such as `7d` |
| `CLIENT_ORIGIN` | Allowed browser origin |
| `BANANA_API_BASE_URL` | Puzzle endpoint |
| `BANANA_API_MODE` | `live` or `mock` |
| `BANANA_API_FALLBACK` | `true` or `false` |
| `BANANA_API_TIMEOUT_MS` | Request timeout |
| `BANANA_API_KEY` | Optional. Empty for the public API |
| `BCRYPT_ROUNDS` | Password hashing cost |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional first administrator |

## Version control

`main` is the stable branch and `develop` is the integration branch. Feature work belongs on `feature/authentication`, `feature/puzzle-engine`, `feature/leaderboard`, `feature/event-system`, and `feature/api-integration`. The exact commands are in [docs/git-workflow.md](docs/git-workflow.md). Do not claim the code is on GitHub unless `git remote -v` shows a remote and `git push` succeeded.
