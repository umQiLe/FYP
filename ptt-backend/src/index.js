// src/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const https = require('https');
const fs = require('fs');
const express = require('express');
const { WebSocketServer } = require('ws');
const { execSync } = require('child_process');
const url = require('url');

const WebSocketService = require('./services/websocket');
const { verifyClientToken } = require('./middleware/authentication');

const PORT = 8081;

// --- Certs ---
const CERT_FILE = path.join(__dirname, '..', 'cert.pem');
const KEY_FILE = path.join(__dirname, '..', 'key.pem');

if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
  console.error("[ERROR] [System] Certs missing. Run setup.js first.");
  process.exit(1);
}

const app = express();
const myIP = process.argv[2] || 'localhost';
// Health Check
app.get('/api/health', (req, res) => {

  res.json({ status: 'ok', time: new Date() });
});

function getSSID() {
  try {
    // Use PowerShell to get the Active Network Name (SSID)
    const cmd = 'powershell -Command "(Get-NetConnectionProfile | Select-Object -ExpandProperty Name)"';
    const output = execSync(cmd, { encoding: 'utf8' }).trim();

    // Handle multiple lines if multiple adapters are active (rare but possible)
    // We replace newlines with a slash for display
    return output.replace(/\r\n|\n/g, ' / ') || 'Unknown';
  } catch (e) {
    return 'Unknown (Not connected?)';
  }
}

app.get('/api/system/info', (req, res) => {
  res.json({
    ip: myIP,
    ssid: getSSID()
  });
});


const statsService = require('./services/statsService');

// Stats API
app.get('/api/session/current/stats', async (req, res) => {
  const stats = await statsService.getSessionStats();
  if (!stats) return res.status(404).json({ error: 'No active session or stats found' });
  res.json(stats);
});

app.get('/api/session/:sessionId/stats', async (req, res) => {
  const stats = await statsService.getSessionStats(req.params.sessionId);
  if (!stats) return res.status(404).json({ error: 'Session not found' });
  res.json(stats);
});

// PDF Report API
const reportService = require('./services/reportService');
app.get('/api/session/:sessionId/report', async (req, res) => {
  const stats = await statsService.getSessionStats(req.params.sessionId);
  if (!stats) return res.status(404).send('Session not found');

  try {
    reportService.generateReport(stats, res);
  } catch (error) {
    console.error("[ERROR] PDF Generation failed:", error);
    res.status(500).send("Error generating report");
  }
});

const frontendBuildPath = path.join(__dirname, '..', '..', 'ptt-frontend', 'dist');

if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));

  // Handle React Routing (return index.html for unknown routes)
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // C. Default Message (Development Mode)
  // If no build is found, just tell the user the backend is alive.
  app.get('/', (req, res) => {
    res.send(`
      <h1>[INFO] [System] PTT Backend is Running</h1>
      <p>WebSocket Secure (WSS) is active on port ${PORT}</p>
      <p><em>Note: React frontend build not found. If developing, run 'npm run dev' in the frontend folder.</em></p>
    `);
  });
}

const server = https.createServer({
  key: fs.readFileSync(KEY_FILE),
  cert: fs.readFileSync(CERT_FILE)
}, app);

// --- WEBSOCKET SERVER WITH LOGGING ---
const wss = new WebSocketServer({
  server: server,
  verifyClient: async (info, done) => {


    const { query } = url.parse(info.req.url, true);
    const token = query.token;

    if (!token) {

      return done(false, 401, 'Missing Token');
    }

    try {
      const user = await verifyClientToken(token);
      info.req.user = user;
      // If we reach here, Success!
      return done(true);
    } catch (error) {
      // The error is already logged in authentication.js
      return done(false, 403, error.message);
    }
  }
});

const wsService = new WebSocketService(wss, myIP);
// Once Auth succeeds, this triggers the "Welcome" message
wss.on('connection', (ws, req) => {
  // 'req.user' comes from the verifyClient function
  wsService.handleConnection(ws, req.user);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[INFO] [System] PTT Backend Running on Port ${PORT}`);
});