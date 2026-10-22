# Banana Math Puzzle Challenge — feature/event-system

This branch adds an in-process event bus on top of authentication and the Banana API adapter. The play loop that emits these events during a game is added on `feature/puzzle-engine`. The finished game is on `main`.

Repository: <https://github.com/km450975-max/CISO46-3-Final-Project>

## Version control

| Branch | What it contains |
| --- | --- |
| `feature/authentication` | Accounts and sessions |
| `feature/api-integration` | Banana Game API adapter |
| `feature/event-system` | Event bus and handlers |
| `feature/puzzle-engine` | Game rounds that dispatch these events |
| `main` | The full application |

## Event-driven architecture

`server/src/events/eventBus.js` is an `EventEmitter`. `dispatch` awaits listeners in registration order. Events live only inside this Node process. A restart drops anything not yet handled.

Handlers:

| File | Responsibility |
| --- | --- |
| `handlers/answerOutcome.js` | Save the attempt and update the score when an answer is graded |
| `handlers/activity.js` | Record a short activity line for the admin screen |
| `registerHandlers.js` | Subscribe those handlers to the bus |

Event names used by the handlers are `answer.correct`, `answer.incorrect`, `round.expired`, `answer.submitted`, `score.updated`, `streak.updated`, `round.completed`, `leaderboard.updated`, `user.registered`, `user.logged_in`, and `puzzle.loaded`.

A failure to write the activity log does not undo a score change. This is not a durable queue such as RabbitMQ.

## Interoperability

The Banana adapter from `feature/api-integration` is included. `live` mode calls `https://marcconrad.com/uob/banana/api.php?out=json`. `mock` mode returns a labelled local SVG card. The numeric solution stays on the server.

## Virtual identity

Accounts, bcrypt passwords, roles, and the `access_token` cookie are included. The MongoDB user id is the primary key. Username and email are unique. The password hash is never returned.

## Run the tests

```powershell
npm install --prefix server
Copy-Item .env.example server\.env
npm test --prefix server
```
