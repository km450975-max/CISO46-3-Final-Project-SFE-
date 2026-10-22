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

A game can be 3, 4, or 5 rounds, with base points of 10, 20, or 30. Omitting those fields on `POST /games/start` still defaults to 10 rounds and the difficulty's base points. Ranked mode updates the career score. Practice mode does not. Quit abandons the session, so it cannot be resumed. Points already awarded stay on the career total.

## Version control

The project is a Git repository. `main` is the stable branch and holds the full application. `develop` is the integration branch. Feature work was committed on its own branch and merged back with a merge commit, so the history shows where each part came from.

Published repository: <https://github.com/km450975-max/CISO46-3-Final-Project>

| Branch | What that branch contains |
| --- | --- |
| `main` | The full game: client, scoring, leaderboard, admin, Postman collection, and docs |
| `feature/authentication` | Registration, login, logout, password hashing, and the session cookie |
| `feature/api-integration` | Authentication plus the Banana Game API adapter (live and mock) |
| `feature/event-system` | Authentication, the Banana API adapter, and the event bus with its handlers |

Other local feature branches used while building the game are `feature/puzzle-engine`, `feature/leaderboard`, and `feature/client`. The command sequence is in [docs/git-workflow.md](docs/git-workflow.md). Do not commit `server/.env`.

## Event-driven architecture

The game service does not update the score by itself. It publishes events, and separate handlers do the work. The bus is `server/src/events/eventBus.js`. It is an in-process `EventEmitter`: listeners run inside this Node process, in the order they were registered, and the HTTP response is sent only after the score handler finishes.

When a student submits an answer, the server emits:

1. `answer.submitted`
2. `answer.correct`, `answer.incorrect`, or `round.expired`
3. `score.updated`, `streak.updated`, and `round.completed`
4. `leaderboard.updated` when a ranked game changes the career total

Registration emits `user.registered`. Login emits `user.logged_in`. Loading a round emits `puzzle.loaded`. An activity handler stores each event for the admin screen. A failure to write that log does not undo the score.

This is not a separate message queue. Events are not replayed after a restart. The unique index on a round stops a second submit from awarding points twice.

## Interoperability

Three systems work together through explicit contracts.

| From | To | Contract |
| --- | --- | --- |
| React client | This Express API | JSON at `/api/v1`, session cookie, and `X-Requested-With: XMLHttpRequest` on changes |
| This API | Banana Game API | `GET https://marcconrad.com/uob/banana/api.php?out=json`, which returns an image URL and an integer solution |
| Postman or Newman | This Express API | The collection in `postman/banana-math.postman_collection.json` |

The browser never calls the Banana API and never receives the solution before the round is saved. The adapter in `server/src/services/banana` is the only code that talks to that service. Puzzle images are proxied by this server, and only `sanfoh.com` and `marcconrad.com` over HTTPS are allowed. `mock` mode returns labelled local SVG cards so tests do not pretend to be the live service.

The route list, status codes, and Postman steps are in [docs/api-documentation.md](docs/api-documentation.md).

## Virtual identity

Each person is an account stored in MongoDB. The MongoDB user id is the primary key. Username and email are unique, but they are not the key.

A profile holds the id, username, email, display name, avatar, theme, role, account status, join date, career score, streaks, games played, puzzles solved, badges, and rank. The password hash and the token version are never sent to the browser. On the leaderboard the public identity is the username and display name.

Roles:

- **Student**: play, edit display name, avatar, and theme, and read the leaderboard and personal history.
- **Administrator**: read counts, activity, and Banana API health, and suspend or restore accounts. There is no Admin item in the menu. Only an administrator who opens `/admin` directly sees the panel.

Login stores a JWT in an HttpOnly cookie named `access_token`. The token carries the user id and a token version. Every request loads the user from the database and uses the role stored there. Logout, a password change, or an admin account change increments the token version, so older cookies stop working. `Authorization: Bearer` is also accepted.

## Further detail

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
