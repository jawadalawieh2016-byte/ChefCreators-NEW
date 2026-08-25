# ChefCreators API

Small Render backend used by the static ChefCreators site so the admin panel can see users from every device.

## Render settings

- Root Directory: `apps/api`
- Build Command: `npm install`
- Start Command: `npm start`

## Environment variables

- `DATABASE_URL`: Render PostgreSQL internal database URL.
- `ADMIN_PIN`: Admin PIN used for protected admin routes. Default is `kafta`.
- `CORS_ORIGIN`: Live static site URL, for example `https://chefcreators.onrender.com`.

## Routes

- `GET /health`: API health check.
- `GET /`: API service info.
- `POST /api/users`: Save a visitor's name and age. Requires `userToken` in the JSON body.
- `GET /api/users/:id`: Load one visitor's own status. Requires `x-user-token`.
- `GET /api/users`: Load all users. Requires `x-admin-pin`.
- `PATCH /api/users/:id`: Update ban/pro status. Requires `x-admin-pin`.
- `POST /api/users/:id/flag`: Save a safety flag for a visitor. Requires `x-user-token`.
- `DELETE /api/users/:id`: Delete a user. Requires `x-admin-pin`.

## Smoke test

From the repo root, after the API is deployed:

```sh
npm run smoke:api -- https://chefcreators-api.onrender.com kafta
```

Use your real API URL and admin PIN.
