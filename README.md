# Banana Math Puzzle Challenge — feature/authentication

This branch is the account and session layer. It does not call the Banana Game API, run an event bus, score puzzles, or include the React client. Those arrive on later branches. The finished game is on `main`.

Repository: <https://github.com/km450975-max/CISO46-3-Final-Project>

## Version control

`feature/authentication` is the first feature branch. It sits on top of the initial commits and adds registration, login, logout, and the session cookie.

| Branch | What it adds |
| --- | --- |
| `feature/authentication` | This branch: accounts and sessions |
| `feature/api-integration` | Banana Game API adapter |
| `feature/event-system` | In-process event bus and handlers |
| `main` | The full application |

## Virtual identity

Each person is a `User` document. The MongoDB id is the primary key. Username and email are unique.

A public profile can include the username, email, display name, avatar, theme, and role. The password is stored only as a bcrypt hash. The hash is never returned by the API.

Login signs a JWT and stores it in an HttpOnly cookie named `access_token`. The token carries the user id and a token version. Logout increments that version, so the old cookie stops working. `Authorization: Bearer` is also accepted.

Roles on this branch are `student` and `admin`. An optional administrator is created at startup when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set.

## Interoperability

This branch exposes a JSON API under `/api/v1`. Callers send `X-Requested-With: XMLHttpRequest` on POST requests.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create a student and set the session cookie |
| POST | `/auth/login` | Start a session |
| POST | `/auth/logout` | End the session |
| GET | `/auth/me` | Read the signed-in profile |

There is no external puzzle service on this branch.

## Event-driven architecture

Not included here. The event bus is added on `feature/event-system`.

## Run the tests

```powershell
npm install --prefix server
Copy-Item .env.example server\.env
npm test --prefix server
```

MongoDB is not required for the tests. They use an in-memory database.
