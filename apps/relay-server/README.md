# RemoteDevAI Relay Server

A lightweight cloud relay server that connects mobile clients to desktop agents over the internet using WebSockets.

## Features

- **Real-time bidirectional communication** via Socket.IO
- **Pairing code system** for easy device connection
- **Screen streaming support** (up to 10MB frames)
- **Input control relay** (mouse, keyboard, touch)
- **Zero database** - fully in-memory for simplicity
- **Health monitoring** with /api/health endpoint

## Quick Deploy

### Deploy to Render.com (Recommended - Free Tier)

**Option 1: One-Click Deploy**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/RemoteDevAI)

**Option 2: Manual Deployment**

1. Fork/clone this repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **New +** → **Blueprint**
4. Connect your GitHub repository
5. Select the repository and click **Apply**
6. Render will automatically detect `render.yaml` and deploy

**Option 3: Web Service**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your repository
4. Configure:
   - **Name**: `remotedevai-relay`
   - **Region**: Choose closest to you
   - **Branch**: `master`
   - **Root Directory**: `apps/relay-server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Add environment variable:
   - `NODE_ENV` = `production`
6. Click **Create Web Service**

Your relay server will be available at: `https://remotedevai-relay.onrender.com`

---

### Deploy to Railway.app

1. Go to [Railway](https://railway.app/)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Configure:
   - **Root Directory**: `apps/relay-server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `NODE_ENV` = `production`
6. Railway will auto-assign a PORT
7. Click **Deploy**

Your relay server will be available at: `https://your-project.up.railway.app`

---

### Deploy to Fly.io

1. Install Fly CLI:
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. Login and launch:
   ```bash
   cd apps/relay-server
   fly auth login
   fly launch
   ```

3. Follow prompts:
   - **App name**: `remotedevai-relay` (or your choice)
   - **Region**: Choose closest to you
   - **Database**: No
   - **Deploy now**: Yes

4. The CLI will create `fly.toml` automatically. Verify it contains:
   ```toml
   [build]
     dockerfile = "Dockerfile"

   [env]
     NODE_ENV = "production"

   [[services]]
     internal_port = 3001
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

5. Deploy:
   ```bash
   fly deploy
   ```

Your relay server will be available at: `https://remotedevai-relay.fly.dev`

---

### Deploy to Heroku

1. Install Heroku CLI and login:
   ```bash
   heroku login
   ```

2. Create app:
   ```bash
   cd apps/relay-server
   heroku create remotedevai-relay
   ```

3. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   ```

4. Deploy:
   ```bash
   git push heroku master
   ```

Your relay server will be available at: `https://remotedevai-relay.herokuapp.com`

---

### Deploy with Docker (Any Platform)

1. Build the image:
   ```bash
   cd apps/relay-server
   docker build -t remotedevai-relay .
   ```

2. Run locally:
   ```bash
   docker run -p 3001:3001 -e NODE_ENV=production remotedevai-relay
   ```

3. Push to registry (Docker Hub, AWS ECR, etc.):
   ```bash
   docker tag remotedevai-relay your-registry/remotedevai-relay:latest
   docker push your-registry/remotedevai-relay:latest
   ```

4. Deploy to your cloud platform using the container image

---

## Environment Variables

Only two environment variables are needed:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port (cloud platforms auto-set this) |
| `NODE_ENV` | No | `development` | Set to `production` for deployments |

**That's it!** No database, no API keys, no external services required.

---

## Getting Your Relay URL

After deployment, you'll get a public URL like:

- **Render**: `https://remotedevai-relay.onrender.com`
- **Railway**: `https://your-project.up.railway.app`
- **Fly.io**: `https://remotedevai-relay.fly.dev`
- **Heroku**: `https://remotedevai-relay.herokuapp.com`

### Testing Your Relay

1. Visit your relay URL in a browser - you should see:
   ```json
   {
     "service": "RemoteDevAI Relay Server",
     "version": "1.0.0",
     "status": "running",
     "stats": {
       "agents": 0,
       "viewers": 0,
       "activePairings": 0
     }
   }
   ```

2. Check health endpoint: `https://your-relay-url.com/api/health`

3. Use this URL in your desktop agent and mobile app configuration

---

## Configuring Desktop Agent

Update your desktop agent to connect to the relay:

```javascript
// apps/desktop-simple/server.js or apps/desktop/src/main.ts

const RELAY_URL = 'https://your-relay-url.com'; // Replace with your URL

const socket = io(RELAY_URL, {
  transports: ['websocket', 'polling']
});
```

---

## Configuring Mobile App

Update your mobile app to use the relay:

```typescript
// apps/mobile/src/services/api.ts or config

export const RELAY_URL = 'https://your-relay-url.com'; // Replace with your URL
```

Or use environment variables:

```bash
# .env
EXPO_PUBLIC_RELAY_URL=https://your-relay-url.com
```

---

## Monitoring

### Check Server Status

- **Homepage**: `GET /` - Shows stats
- **Health**: `GET /api/health` - Health check with uptime and memory
- **Agents**: `GET /api/agents` - List all connected agents
- **Agent by Code**: `GET /api/agent/:code` - Lookup agent by pairing code

### Logs

- **Render**: Dashboard → Logs tab
- **Railway**: Dashboard → Deployments → View logs
- **Fly.io**: `fly logs`
- **Heroku**: `heroku logs --tail`

---

## Free Tier Limitations

| Platform | Uptime | Sleep | Memory | Bandwidth |
|----------|--------|-------|--------|-----------|
| **Render** | 24/7 for 90 days/month | Spins down after 15min inactivity | 512MB | Limited |
| **Railway** | 500 hours/month | No auto-sleep | 512MB | 100GB/month |
| **Fly.io** | 24/7 | No auto-sleep | 256MB shared | 160GB/month |
| **Heroku** | 550 hours/month | Sleeps after 30min | 512MB | Limited |

**Recommendation**: Use **Render** or **Railway** for best free tier experience.

**Note**: Free tiers may have cold starts (15-30s delay) when the service hasn't been used recently.

---

## Troubleshooting

### Connection Issues

1. **CORS errors**: The server allows all origins (`origin: '*'`) - check your client code
2. **WebSocket fails**: Ensure your platform supports WebSocket upgrades (all listed platforms do)
3. **Timeouts**: Check if your mobile/desktop app uses the correct relay URL

### Performance

1. **Slow streaming**: Free tiers have limited CPU/memory - consider upgrading
2. **Disconnections**: Increase `pingTimeout` in server.js if needed
3. **Frame drops**: Reduce quality/FPS in screen capture settings

### Deployment Fails

1. **Build errors**: Run `npm install` locally first to verify dependencies
2. **Port binding**: Don't hardcode port - use `process.env.PORT`
3. **Module errors**: Verify `"type": "module"` is in package.json

---

## Local Development

```bash
cd apps/relay-server
npm install
npm start
```

Or with auto-reload:
```bash
npm run dev
```

Server runs on http://localhost:3001

---

## Architecture

```
┌─────────────┐         WebSocket         ┌──────────────┐
│   Mobile    │ ◄────────────────────────► │    Relay     │
│  (Viewer)   │      Socket.IO (WSS)       │    Server    │
└─────────────┘                            │  (Cloud)     │
                                           └──────┬───────┘
                                                  │
                                          WebSocket
                                                  │
                                           ┌──────▼───────┐
                                           │   Desktop    │
                                           │   (Agent)    │
                                           └──────────────┘
```

**Flow**:
1. Desktop agent registers → Gets pairing code
2. Mobile viewer connects with code → Links to agent
3. All messages relay through cloud server
4. No direct P2P connection needed

---

## API Reference

### WebSocket Events

**Agent Events** (Desktop → Relay):
- `agent:register` - Register new agent, get pairing code
- `screen:frame` - Send screen frame to viewers
- `screen:displays` - Send available displays
- `screen:started` - Confirm stream started
- `screen:stopped` - Confirm stream stopped
- `command-output` - Send command output
- `command-complete` - Command finished

**Viewer Events** (Mobile → Relay):
- `viewer:connect` - Connect to agent via pairing code
- `screen:start` - Request screen stream
- `screen:stop` - Stop screen stream
- `screen:display` - Change display
- `screen:settings` - Update stream settings
- `input:*` - Input events (click, type, scroll, etc.)
- `execute-command` - Run command on agent

### REST Endpoints

- `GET /` - Server info and stats
- `GET /api/health` - Health check
- `GET /api/agents` - List all online agents
- `GET /api/agent/:code` - Get agent by pairing code

---

## Security Considerations

**Current Setup** (Development):
- No authentication
- No rate limiting
- No encryption (beyond HTTPS/WSS)
- Open CORS

**For Production**:
- Add authentication middleware
- Implement rate limiting
- Add pairing code expiration (10 min)
- Use environment-based CORS
- Add request validation
- Consider Redis for multi-instance deployments

---

## Support

- **Documentation**: See main repository README
- **Issues**: GitHub Issues
- **License**: MIT

---

## Next Steps

1. Deploy relay server (5 minutes)
2. Get your relay URL
3. Update desktop agent config with URL
4. Update mobile app config with URL
5. Test pairing and connection

**You're ready to control your desktop from anywhere!**
