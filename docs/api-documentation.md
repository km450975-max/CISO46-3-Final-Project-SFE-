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
| 400 | Validation or illegal action |
| 401 | Missing or expired session |
| 403 | Signed in, but not allowed |
| 404 | Missing, or hidden because it belongs to someone else |
| 409 | Duplicate or the round is already closed |
| 502 | Puzzle image could not be fetched |
| 503 | Banana API is unavailable and fallback is off |

Browsers must send cookies (`credentials: 'include'`) and, on POST, PATCH, and PUT, the header `X-Requested-With: XMLHttpRequest`.

List endpoints accept `page` (default 1) and `limit` (default 20, maximum 50) and return:

```json
{ "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 1 } }
```

## Authentication

| Method | Path | Access | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | `username`, `email`, `password` |
| POST | `/auth/login` | Public | `email`, `password` |
| POST | `/auth/logout` | User | none |
| GET | `/auth/me` | User | none |

Registration creates a student. The response sets an `access_token` cookie and returns the public profile. It does not return a password hash.

## Games

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/games/start` | Start or resume. Body: `difficulty` (`easy`, `medium`, `hard`), `mode` (`ranked` or `practice`), optional `restart` |
| GET | `/games/active` | Current game, or `game: null` |
| GET | `/games/:id` | One game owned by the caller |
| POST | `/games/:id/submit` | Body: `answer` integer. Optional `expired: true` only after the server clock has passed |
| POST | `/games/:id/expire` | Lock the round when the server timer has ended |
| POST | `/games/:id/hint` | One hint for the open round |
| POST | `/games/:id/next` | Load the next puzzle after the current round is resolved |

Submission is on the game, not on a bare puzzle id, because the timer, score, and duplicate check belong to the session. A second submit for the same round returns `409 DUPLICATE_SUBMISSION`.

The puzzle object in these responses has `id`, `source`, `simulated`, `fallback`, and `imagePath`. It does not have `solution`. After a round is saved, `attempt.solution` is included.

`source` is `banana-api` or `mock`. `simulated: true` means the image was generated locally.

## Puzzles

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/puzzles/new` | The puzzle already attached to the active game. Does not fetch an extra Banana puzzle |
| GET | `/puzzles/:id` | Public metadata if the caller is allowed to see it |
| GET | `/puzzles/:id/image` | Image bytes. Mock cards are SVG. Live images are proxied from the allow-listed host |

## Leaderboard

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/leaderboard` | Active students, highest score first |
| GET | `/leaderboard/me` | The caller's rank. Administrators are not listed |

Each row has `rank`, `id`, `username`, `displayName`, `avatarKey`, `totalScore`, `bestStreak`, `gamesPlayed`, and `isCurrentUser`. Email addresses are not included.

## Profile and history

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/users/me` | Full profile for the signed-in user |
| PATCH | `/users/me` | `displayName`, `avatarKey`, `theme` |
| PATCH | `/users/me/password` | `currentPassword`, `newPassword`. Issues a new cookie |
| GET | `/users/me/stats` | Dashboard totals, active game, and top five |
| GET | `/users/me/history` | Past games and their saved rounds |

## Administration

All of these require an administrator.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/stats` | Counts of users, games, and answers |
| GET | `/admin/health` | Database, process uptime, and a live Banana API probe when mode is `live` |
| GET | `/admin/users` | Accounts, without password hashes |
| PATCH | `/admin/users/:id` | `role` or `accountStatus` |
| GET | `/admin/activity` | Recorded application events |

`GET /health` is public and only reports that the process is up. It does not call the Banana API.

## Failure behaviour

If the Banana API times out, returns HTML, or returns a solution that is not an integer, `POST /games/start` and `POST /games/:id/next` respond with `503` and `BANANA_API_UNAVAILABLE`. No active game is created for a failed start. The rest of the API, including login and the leaderboard, keeps working.
