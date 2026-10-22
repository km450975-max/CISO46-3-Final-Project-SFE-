# Banana Math Puzzle Challenge — feature/api-integration

This branch adds the Banana Game API adapter on top of authentication. It does not yet score a game, run the event bus, or include the React client. The finished game is on `main`.

Repository: <https://github.com/km450975-max/CISO46-3-Final-Project>

## Version control

`feature/api-integration` follows `feature/authentication`.

| Branch | What it contains |
| --- | --- |
| `feature/authentication` | Accounts and sessions |
| `feature/api-integration` | Accounts plus the Banana API adapter |
| `feature/event-system` | The adapter plus the event bus |
| `main` | The full application |

## Interoperability

The only code that talks to the external service is `server/src/services/banana`.

| Mode | Behaviour |
| --- | --- |
| `live` | `GET https://marcconrad.com/uob/banana/api.php?out=json`. The body is an image URL and an integer solution. |
| `mock` | A labelled local SVG card, such as `3 + 4 = ?`. Tests use this mode. |
| fallback | Used only when `BANANA_API_FALLBACK=true` and a live call fails. The card is still marked as mock. |

The solution stays inside the server process. This branch does not send it to a browser. If `BANANA_API_KEY` is set, the adapter sends it as `x-api-key`. The public Banana API does not need a key.

Image hosts used later are limited to `sanfoh.com` and `marcconrad.com` over HTTPS.

## Virtual identity

Registration, login, logout, and `GET /auth/me` are already on this branch. The session is an HttpOnly `access_token` cookie. Passwords are bcrypt hashes. Username and email are unique. The MongoDB user id is the primary key.

## Event-driven architecture

Not included here. Handlers and the event bus are added on `feature/event-system`.

## Run the tests

```powershell
npm install --prefix server
Copy-Item .env.example server\.env
npm test --prefix server
```

Set `BANANA_API_MODE=mock` in `server/.env` for offline use. The automated tests already force the mock adapter.
