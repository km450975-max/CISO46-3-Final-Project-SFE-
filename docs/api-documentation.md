# HTTP API

Base path: `/api/v1`

Successful responses:

```json
{ "success": true, "data": {} }
```

Errors:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Please check the form and try again.", "details": [] }
}
```

| Status | Meaning |
| --- | --- |
| 200 | Read or updated |
| 201 | Created |
| 400 | Validation or an illegal action |
| 401 | Missing or expired session |
| 403 | Signed in, but not allowed, or the browser header is missing |
| 404 | Missing, or hidden because it belongs to someone else |
| 409 | Duplicate account field, or the round is already closed |
| 502 | Puzzle image could not be fetched |
| 503 | Banana API is unavailable and fallback is off |

## How to call it

The session is an HttpOnly `access_token` cookie. `Authorization: Bearer <token>` is also accepted. Login and registration return the public profile only. The token is in the cookie, not the JSON body.

POST, PATCH, and PUT must send `X-Requested-With: XMLHttpRequest`. Without it the API returns `403 CSRF_REJECTED` before validation. GET, HEAD, and OPTIONS do not need that header.

Browsers send the cookie with `credentials: 'include'`. Postman and Newman keep it in the cookie jar.

Login and registration are limited to 20 calls per 15 minutes. Submit and expire are limited to 40 calls per minute. Those limits are skipped when `NODE_ENV=test`.

List endpoints accept `page` (default 1) and `limit` (default 20, maximum 50) and return:

```json
{ "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 1 } }
```

Ids are 24-character hex strings.

## Public

| Method | Path | Access | Body | Success |
| --- | --- | --- | --- | --- |
| GET | `/health` | Public | none | `{ "status": "ok" }` |

This check does not call the Banana API and does not check MongoDB.

## Authentication

| Method | Path | Access | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | `username`, `email`, `password` |
| POST | `/auth/login` | Public | `email`, `password` |
| POST | `/auth/logout` | User | none |
| GET | `/auth/me` | User | none |

Registration creates a student and returns `201` with `{ user }`. The username is 3–20 letters, numbers, or underscores. The password is 8–72 characters and must include a letter and a number. A duplicate username or email returns `409 DUPLICATE`.

Login returns `200` and `{ user }`. A wrong email or password returns `401 INVALID_CREDENTIALS`. A suspended account returns `403 ACCOUNT_SUSPENDED`.

Logout increments the token version, clears the cookie, and returns `{ loggedOut: true }`. A later call with the old cookie returns `401 UNAUTHENTICATED`.

`GET /auth/me` returns `{ user }`. The profile never includes `passwordHash`.

## Games

Every game route requires a signed-in user.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/games/start` | Start a game, or resume the active one |
| GET | `/games/active` | Current game, or `game: null` |
| GET | `/games/:id` | One game owned by the caller |
| POST | `/games/:id/submit` | Save an integer answer for the open round |
| POST | `/games/:id/expire` | Lock the round after the server timer has ended |
| POST | `/games/:id/hint` | One hint for the open round |
| POST | `/games/:id/next` | Load the next puzzle after the current round is resolved |
| POST | `/games/:id/quit` | Abandon the session so it cannot be resumed |

`POST /games/start` body:

| Field | Values | When omitted |
| --- | --- | --- |
| `difficulty` | `easy`, `medium`, `hard` | required |
| `mode` | `ranked` or `practice` | `ranked` |
| `restart` | boolean | `false`. `true` abandons the active game and starts another |
| `totalRounds` | `3`, `4`, or `5` | `10`, the older default |
| `basePoints` | `10`, `20`, or `30` | easy 10, medium 20, hard 30 |

A new game returns `201`. Resuming an existing active game returns `200` and does not draw another puzzle. A failed Banana API call returns `503 BANANA_API_UNAVAILABLE` and does not leave a new active game.

The response is `{ game, puzzle, attempt, rounds }`. While the round is open, `puzzle` has `id`, `source`, `simulated`, `fallback`, and `imagePath`. It does not have `solution`. `source` is `banana-api` or `mock`. `simulated: true` means the image was generated locally. `attempt` is `null` until the round is saved.

`game` includes `id`, `mode`, `difficulty`, `basePoints`, `currentRound`, `totalRounds`, `score`, streaks, `status`, `hintUsed`, `hintText`, `remainingMs`, and the round timestamps. `status` is `active`, `completed`, or `abandoned`.

`POST /games/:id/submit` body is `{ "answer": 0 }` or `{ "expired": true }`. `answer` must be an integer. A wrong integer is a valid submission and scores 0. After the round is saved, `attempt.solution` and each saved item in `rounds` include the integer solution. The top level also includes `correct`, `timedOut`, `points`, `breakdown`, `streak`, and `gameCompleted`.

A second submit for the same round returns `409 DUPLICATE_SUBMISSION`. Calling expire while time remains returns `400 ROUND_STILL_OPEN`. There is a 1 second server grace after `roundEndsAt`.

`POST /games/:id/hint` sets `hintUsed` and returns `hint` plus the session. The hint costs 5 points if the answer is later correct. A hint after the round is saved returns `409 ROUND_CLOSED`.

`POST /games/:id/next` moves to the next round only after the current round has an attempt. Calling it too early returns `400 ROUND_OPEN`. The new puzzle again omits `solution`.

`POST /games/:id/quit` sets `status` to `abandoned` and `endedAt`. Ranked points already awarded stay on the career total. `gamesPlayed` increments only when a ranked game completes every round. `GET /games/active` then returns `game: null`. An unknown id, or another player's id, returns `404 GAME_NOT_FOUND`.

Ranked mode updates career score and streak immediately. Practice mode keeps the streak inside that session and does not change the leaderboard.

## Puzzles

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/puzzles/new` | The puzzle already attached to the active game. Does not fetch an extra Banana puzzle |
| GET | `/puzzles/:id` | Metadata when the caller is allowed to see that puzzle |
| GET | `/puzzles/:id/image` | Image bytes. Mock cards are `image/svg+xml`. Live images are proxied from the allow-listed host |

`GET /puzzles/new` with no active game returns `404 NO_ACTIVE_GAME`. A puzzle the caller has not played returns `404 PUZZLE_NOT_FOUND`. The image route returns the same code, or `502` when the remote image cannot be fetched. None of these responses include the solution.

## Leaderboard

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/leaderboard` | Active students, highest score first, then best streak, then older accounts |
| GET | `/leaderboard/me` | The caller's rank. Administrators get `rank: null` |

Each row has `rank`, `id`, `username`, `displayName`, `avatarKey`, `totalScore`, `bestStreak`, `gamesPlayed`, and `isCurrentUser`. Email addresses are not included.

## Profile and history

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/users/me` | Profile for the signed-in user, including rank and achievements |
| PATCH | `/users/me` | At least one of `displayName` (2–40 characters), `avatarKey` (`banana`, `ocean`, `forest`, `sunset`, `grape`, `slate`), `theme` (`light` or `dark`) |
| PATCH | `/users/me/password` | `currentPassword` and `newPassword`. Issues a new cookie. A wrong current password returns `400 INVALID_PASSWORD` |
| GET | `/users/me/stats` | `{ user, stats, activeGame, leaderboardPreview }` for the dashboard |
| GET | `/users/me/history` | Past games, including abandoned ones, and the saved rounds. Solutions appear only on rounds that were submitted |

## Administration

These routes require `role: admin`. A signed-in student receives `403 FORBIDDEN`. A signed-out caller receives `401 UNAUTHENTICATED`. The web app does not link to `/admin`. A student or a signed-out visitor who opens that page sees the ordinary "Page not found" screen. Only an administrator who opens the URL directly sees the panel. The API check is separate from that screen.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/stats` | `students`, `admins`, `suspended`, `activeGames`, `completedGames`, `attempts`, `correctAnswers`, `accuracy` |
| GET | `/admin/health` | `database`, `uptimeSeconds`, a Banana API probe, and the in-process event bus |
| GET | `/admin/users` | Accounts, without password hashes |
| PATCH | `/admin/users/:id` | `role` (`student` or `admin`) and/or `accountStatus` (`active` or `suspended`) |
| GET | `/admin/activity` | Recorded application events |

An administrator cannot suspend their own account or remove their own admin role. Demoting the last active administrator returns `400 INVALID_ACTION`. A missing user returns `404 USER_NOT_FOUND`. A successful update returns `{ id, username, email, role, accountStatus }` and invalidates that user's current token.

The admin health probe reports the Banana API as `up` or `down`. It does not store the puzzle it fetched.

## Failure behaviour

If the Banana API times out, returns HTML, or returns a solution that is not an integer, `POST /games/start` and `POST /games/:id/next` respond with `503` and `BANANA_API_UNAVAILABLE`. Login, the leaderboard, and `GET /health` keep working. Set `BANANA_API_FALLBACK=true` only when a failed live call should be replaced by a labelled mock card.

## Postman collection

`postman/banana-math.postman_collection.json` calls every route above and checks the status, the `success` flag, and the fields that must stay hidden. `postman/build-collection.mjs` regenerates that file.

Copy `postman/local.postman_environment.example.json` to `postman/local.postman_environment.json`. The administrator login uses the collection variables `seedAdminEmail` (`admin@school.test`) and `seedAdminPassword` (`Admin1234`), which match `server/.env`. The local environment file is gitignored. The API must already be running.

```powershell
npm run postman
```

That command rebuilds the collection and runs it with Newman against `http://127.0.0.1:5000/api/v1`. Import the collection and the environment into Postman to run the same checks from the app. The cookie jar carries the session. Each run registers a new student, plays a 3-round practice game at base 30, submits a wrong integer, quits, confirms a student cannot open admin stats, then signs in as the administrator, suspends and restores that student, and logs out.

Checked against the local API on 22 October 2026: 42 requests, 113 assertions, 0 failures, about 8.5 seconds. The live Banana API supplied the puzzle image.
