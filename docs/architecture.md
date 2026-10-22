# Architecture

Banana Math Puzzle Challenge is a full-stack educational game. The browser never grades an answer and never receives a puzzle solution before the round is locked.

```text
React (Vite) → Express /api/v1 → services → MongoDB
                      ↘ Banana API adapter
```

## Modules

| Area | Responsibility |
| --- | --- |
| `client/` | Pages, forms, timer display, and HTTP calls |
| `server/src/routes` | URL map and middleware order |
| `server/src/controllers` | Translate HTTP into service calls |
| `server/src/services` | Registration, games, scoring, leaderboard, admin |
| `server/src/services/banana` | The only code that talks to the Banana Game API |
| `server/src/events` | In-process event bus and handlers |
| `server/src/models` | Mongoose schemas and indexes |
| `server/src/middleware` | Authentication, roles, validation, errors, rate limits |

## Banana Game API

Documented at <https://marcconrad.com/uob/banana/doc.php>.

```text
GET https://marcconrad.com/uob/banana/api.php?out=json
```

A live response looks like this:

```json
{ "question": "https://www.sanfoh.com/uob/banana/data/example.png", "solution": 6 }
```

The API returns an image URL and the integer solution. It does not accept a difficulty, a hint request, or an answer to validate. This application therefore:

1. Calls the API from the server.
2. Stores the image URL and solution in MongoDB.
3. Sends the browser an image proxy path and no solution.
4. Compares the submitted integer with the stored solution.
5. Reveals the solution only after that round has been saved.

`BANANA_API_MODE=mock` uses labelled local SVG cards so tests and offline demos do not pretend to be the live service. `BANANA_API_FALLBACK=true` uses those cards only after a live request fails, and the puzzle is still marked `source: "mock"`.

There is no API key today. If one is set in `BANANA_API_KEY`, the adapter sends it as `x-api-key` and the browser still never sees it.

Image downloads are limited to `sanfoh.com` and `marcconrad.com` over HTTPS so a stored URL cannot be used to request an arbitrary host.

## Difficulty and scoring

The external API does not classify puzzles. Easy, medium, and hard are local rules in `server/src/services/scoring/rules.js`.

| Difficulty | Time | Base points | Speed bonus |
| --- | --- | --- | --- |
| Easy | 60 seconds | 10 | 1 × whole seconds left |
| Medium | 45 seconds | 20 | 1 × whole seconds left |
| Hard | 30 seconds | 30 | 2 × whole seconds left |

A correct answer scores `max(1, base + speed + streak − hint)`.

- Streak bonus is 2 points for every earlier correct answer in the current streak. The first correct answer in a row has no streak bonus.
- A hint costs 5 points and describes the number of digits and whether the answer is even or odd. It never contains the answer.
- An incorrect answer or an expired round scores 0 and sets the streak to 0.
- The server allows one extra second for network delay. The displayed clock does not include that grace, and the client cannot extend it.
- Ranked points update the career total immediately. Practice points stay on that game only.
- A game has 10 rounds. One attempt can be stored per round because `{ session, roundNumber }` is unique.

A ranked game continues the player's career streak. A practice game has its own streak and does not change rank, career score, or badges.

## Event-driven flow

`AppEventBus.dispatch` awaits listeners in registration order. Producers do not update the score themselves.

When a student submits an answer:

1. The game service checks ownership, game status, and the server clock.
2. It emits `answer.submitted`.
3. It emits `answer.correct`, `answer.incorrect`, or `round.expired`.
4. The outcome handler inserts the attempt, updates the session, and, for ranked play, updates the user.
5. The service emits `score.updated`, `streak.updated`, and `round.completed`.
6. If the career total changed, it emits `leaderboard.updated`.
7. The HTTP response returns the saved state.

Other events are `user.registered`, `user.logged_in`, and `puzzle.loaded`. An activity handler records each event for the admin screen. A failure to write that log does not roll back the score.

This bus is an in-process `EventEmitter`. It is not a queue. Events are not replayed after a crash, so the score is written before the response is sent, and the unique attempt index stops a retry from awarding points twice. A later version can write the same event into the database in the same operation as the attempt (a transactional outbox) and have a worker publish it to a durable broker. Transactions need a MongoDB replica set, which a default local server does not provide, so this version uses ordered awaited writes instead.

The leaderboard is calculated from `User.totalScore` at read time. `leaderboard.updated` records that the total changed. It does not keep a second copy of the ranking.

Socket.IO is not used. Rankings update when the page is loaded.

## Virtual identity

Each account is keyed by a MongoDB user id. Username and email are unique but are not the primary key.

A profile contains the id, username, email, display name, avatar, theme, role, status, creation date, career score, streaks, games played, puzzles solved, badges, and rank. Password hashes and token versions are never returned.

Roles:

- **Student**: play, edit display name, avatar, and theme, read the leaderboard, and read personal history.
- **Administrator**: read aggregate stats, activity, and Banana API health, and suspend or reinstate accounts.

`requireRole('admin')` runs on the server. Hiding the Admin link is only a convenience. JWTs carry the user id and a token version. Every request loads the user and uses the role stored in the database, so a role change applies immediately. Logout, password change, and an admin account change increment the token version and reject older cookies.

## Security choices

- Passwords are hashed with bcrypt (via `bcryptjs`) before they are stored.
- The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- State-changing requests must send `X-Requested-With: XMLHttpRequest`, which blocks a simple cross-site form post from using the cookie.
- Login and answer routes are rate-limited outside the test environment.
- Request bodies are validated with Zod. Keys that start with `$` or contain `.` are removed before validation.
- Errors returned to the browser do not include stack traces, hashes, or tokens.
- Logs do not include passwords or cookies.
- A player can open only puzzles attached to that player's games. Another player's image request returns 404.

## Data collections

- `User`
- `Puzzle` — private `solution`, public image metadata
- `GameSession` — one active game per user, enforced by a partial unique index
- `GameAttempt` — one saved answer per round
- `Achievement` — one row per user and badge type
- `ActivityEvent` — event name, user, and a short message
