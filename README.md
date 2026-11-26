# Orbit Chat

Orbit is a responsive, real-time chat app MVP built around a simple idea: keep good conversations close. It includes account registration, one-to-one chats, group conversations, live messages, online presence, and browser-based voice/video calls with screen sharing.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and either Docker or PostgreSQL.

1. Copy the environment template and set a random JWT secret of at least 32 characters and first-admin username/password. The admin password must be 12–72 characters:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

   To use an existing PostgreSQL server instead, leave `DATABASE_URL` empty in `.env` and set `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` to that server's connection settings. Keep the password in `.env` and do not commit it. The target database must already exist; the app creates its tables on startup.

3. Install dependencies and start the app:

   ```powershell
   npm install
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) and sign in with the configured admin credentials. Use **Admin tools** to create accounts; public registration is disabled.

The database container is exposed on host port 5433 to avoid colliding with a local PostgreSQL service. The server creates its database tables on startup. The API and Socket.IO server run on port 3001; Vite proxies browser requests to it during development.

## Production build

```powershell
npm run build
npm start
```

Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PORT`, and `CLIENT_ORIGIN` in the deployment environment. Serve the built `dist` directory with a static host or reverse proxy, and use HTTPS so session cookies remain secure.

### Deploy with Cloudflare and Render

Cloudflare hosts the static frontend; the Node.js API and PostgreSQL database must run separately. This repository includes a Render Blueprint in `render.yaml` for the API and database.

1. In Render, create a new Blueprint from this GitHub repository and deploy it. The Blueprint generates a `JWT_SECRET`, connects the API to PostgreSQL, and allows the Cloudflare site origin. The free PostgreSQL plan is for testing and may have usage or expiration limits; check Render's current plan details before storing important data.
2. The production frontend defaults to `https://orbit-chat-api.onrender.com`, the API URL for this Render Blueprint. If Render assigns a different URL or you use another API host, set the Cloudflare Workers & Pages build variable `VITE_API_URL` to that public API URL for production (and preview if needed), then trigger a fresh deployment.
3. In the Render API service's **Environment** settings, set `CLIENT_ORIGIN` to exactly `https://orbit-chat.ibotsdeveloper.workers.dev` (no path), then redeploy the API. This matters for existing Render services too: their saved environment value can still point at an older Cloudflare domain even when `render.yaml` has been updated. If your Cloudflare site uses a different domain, use that exact origin instead. The Blueprint sets `COOKIE_SAME_SITE=none` for cross-site session cookies; both sites must use HTTPS.
4. Open `https://<your-api-host>/api/health`. It should return JSON such as `{"status":"ok"}`. Then reload the Cloudflare site and try registering an account.

Do not set `VITE_API_URL` to the Cloudflare site URL: it must point to the Render API service. Keep database credentials and `JWT_SECRET` in Render environment settings, not in Cloudflare frontend variables.

## Meetings

Open **Meetings** in the sidebar to start an instant video meeting or schedule one for later. You can invite up to five Orbit accounts; meetings support up to six participants total. Copy a meeting link to share it, or open **Meetings** and paste a link to join. Participants must sign in to Orbit before joining. Meeting links grant access to anyone who has the link, so share them privately.

Scheduled meetings and invitations are stored in PostgreSQL. Live audio/video uses the same Socket.IO and WebRTC service as chat calls; it is not hosted by Cloudflare Pages.

## Calls and screen sharing

Start a voice or video call from a conversation header. Group calls support up to six people. During a call, use **Share screen** to present a screen or window; the browser will ask you to choose what to share. Calls require camera and microphone permission, and screen sharing requires a secure browser context (localhost or HTTPS).

Calls use peer-to-peer WebRTC with a public STUN server. Some networks require a TURN relay to connect; production deployments should configure a trusted TURN service and review its access, privacy, and cost policies. The development setup does not include TURN.

Messages and file attachments are stored in PostgreSQL and delivered live to connected members. Attachments accept any file type, are downloaded rather than rendered inline, and are limited to 50 MB each; storing files in PostgreSQL can consume database capacity quickly. This MVP does not provide end-to-end encryption, push notifications, or message editing/deletion. Do not use it for sensitive conversations without a security review and a production deployment plan.
