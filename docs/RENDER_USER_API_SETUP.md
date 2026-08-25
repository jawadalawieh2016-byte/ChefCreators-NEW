# Render User API Setup

Use this when the static ChefCreators site needs the admin panel to show users from every device.

## 1. Create the database

Fast option: in Render, use the repo `render.yaml` Blueprint. It creates:

- `chefcreators-db`
- `chefcreators-api`

After the Blueprint service is created, set `CORS_ORIGIN` on `chefcreators-api` to your live static site URL.

Manual option:

1. In Render, click **+ New**.
2. Choose **PostgreSQL**.
3. Name it `chefcreators-db`.
4. Create it and keep the **Internal Database URL** available.

## 2. Create the API service

1. In Render, click **+ New**.
2. Choose **Web Service**.
3. Connect the same GitLab repository.
4. Set:
   - **Root Directory:** `apps/api`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables:
   - `DATABASE_URL`: paste the Render PostgreSQL internal database URL.
   - `ADMIN_PIN`: `kafta` or your real admin PIN.
   - `CORS_ORIGIN`: your live static site URL, for example `https://chefcreators.onrender.com`.
6. Deploy the API service.
7. Copy the API service URL, for example `https://chefcreators-api.onrender.com`.
8. Open `https://chefcreators-api.onrender.com` in a browser. It should say `ChefCreators API`.
9. Open `https://chefcreators-api.onrender.com/health` in a browser. It should show `{"ok":true}`.

You can also run a full API test from this project:

```sh
npm run smoke:api -- https://chefcreators-api.onrender.com kafta
```

Use your real API URL and admin PIN. If it prints `Render API smoke test passed.`, the shared database/API path is working.

## 3. Connect the static HTML files

In both HTML files:

- `ChefCreators_Latest_Updated_YouTube (1).html`
- `ChefCreators_ADMIN_FIXED (2).html`

Replace:

```js
const API_BASE_URL = 'https://YOUR-RENDER-BACKEND.onrender.com';
```

with your real API service URL:

```js
const API_BASE_URL = 'https://chefcreators-api.onrender.com';
```

Then redeploy the static `chefcreators` service.

Do not leave `YOUR-RENDER-BACKEND` in the live HTML. If that placeholder is still there, the site falls back to browser-only storage and the admin panel will only show users from your own device.

If the admin panel shows this warning, the API URL has not been connected yet:

```text
Shared Render API is not connected yet. This panel is showing only users saved on this browser.
```

If the admin panel shows this warning, the API URL was added but the request failed:

```text
Shared Render API is configured but could not be reached. Check the API URL, CORS_ORIGIN, and admin PIN.
```

Check that:

- The API URL opens `/health` successfully.
- `CORS_ORIGIN` exactly matches your live static site URL.
- `ADMIN_PIN` on Render matches the admin PIN in the HTML.

If you change the admin PIN away from `kafta`, make sure any code that opens the built-in admin panel calls:

```js
showChefCreatorsAdminControls('your-new-pin')
```

Shortcut command:

```sh
npm run set:api-url -- https://chefcreators-api.onrender.com
```

Replace the URL with your real `chefcreators-api` URL. This command updates both HTML files for you.

Before redeploying the static site, run:

```sh
npm run verify:api-url
```

It fails if either HTML file still has the placeholder API URL.

## 4. Test

1. Open the live static site on another device.
2. Enter a name and age, then press **Continue**.
3. Open the admin panel.
4. Press **Refresh users**.

The user from the other device should appear.
