const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

// --- Configuration ---
const PORT = 8081;
const FIREWALL_RULES = {
    custom: '80fypgogo',
    node: 'Node.js JavaScript Runtime',
    nodeExe: 'node.exe'
};
const LAST_IP_FILE = path.join(__dirname, '.last_ip');
const CERT_FILE = path.join(__dirname, 'cert.pem');
const KEY_FILE = path.join(__dirname, 'key.pem');

// --- Helper: Get Local IP ---
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    let bestCandidate = null;

    for (const name of Object.keys(interfaces)) {
        const lowerName = name.toLowerCase();
        // Skip virtual/internal interfaces
        if (lowerName.includes('vmware') || lowerName.includes('virtual') || lowerName.includes('wsl') || lowerName.includes('docker') || lowerName.includes('pseudo')) {
            continue;
        }

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // Prefer Wi-Fi
                if (lowerName.includes('wi-fi') || lowerName.includes('wireless') || lowerName.includes('wlan')) {
                    return iface.address;
                }
                if (!bestCandidate) bestCandidate = iface.address;
            }
        }
    }
    return bestCandidate || 'localhost';
}

// --- Helper: Check/Generate Certs ---
function ensureCertificates(currentIP) {
    let lastIP = null;
    if (fs.existsSync(LAST_IP_FILE)) {
        lastIP = fs.readFileSync(LAST_IP_FILE, 'utf8').trim();
    }

    const certsExist = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE);
    const ipMatch = (lastIP === currentIP);

    if (certsExist && ipMatch) {
        console.log(`[INFO] IP (${currentIP}) matches last run. Reusing existing certificates.`);
        return;
    }

    if (!certsExist) {
        console.log(`[WARN] Certificates missing. Generating new ones...`);
    } else if (!ipMatch) {
        console.log(`[WARN] IP changed (Old: ${lastIP}, New: ${currentIP}). Regenerating certificates...`);
    }

    try {
        // Look for mkcert in priority order
        // 1. Root bin (specific name or generic)
        // 2. Local/Parent folders
        let mkcertCmd = null;

        const candidates = [
            path.join(__dirname, '..', 'bin', 'mkcert.exe'),
            path.join(__dirname, '..', 'bin', 'mkcert-v1.4.4-windows-amd64.exe'), // Common download name
            path.join(__dirname, 'mkcert.exe'),
            path.join(__dirname, '..', 'mkcert.exe')
        ];

        for (const c of candidates) {
            if (fs.existsSync(c)) {
                mkcertCmd = c;
                break;
            }
        }

        if (!mkcertCmd) {
            throw new Error("Could not find 'mkcert.exe' or 'mkcert-v1.4.4-windows-amd64.exe' in the 'bin' folder or project root.");
        }

        const cmd = `"${mkcertCmd}" -cert-file cert.pem -key-file key.pem ${currentIP} localhost 127.0.0.1`;
        console.log(`[EXEC] ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });

        fs.writeFileSync(LAST_IP_FILE, currentIP);
        console.log(`[SUCCESS] Certificates generated for ${currentIP}`);

    } catch (e) {
        console.error(`[ERROR] Failed to generate certificates.`);
        console.error(e.message);
        console.error(`Attempted to find mkcert binary but failed.`);
        // Exit here because without certs, the secure server will likely fail or be untrusted
        // process.exit(1); // Optional: decide if we want hard stop
    }
}

// --- Main Execution ---
console.log("--------------------------------------------------");
console.log("   PTT APPLICATION - PRODUCTION SERVER");
console.log("--------------------------------------------------");

const currentIP = getLocalIP();
console.log(`[INIT] Detected IP: ${currentIP}`);

// 1. Manage Certificates
ensureCertificates(currentIP);

// --- Firewall Management Functions (From setup.js) ---
// --- Firewall Management Functions ---
function runElevatedBatch(commands) {
    const batPath = path.join(__dirname, 'temp_fw_rules.bat');
    try {
        fs.writeFileSync(batPath, commands.join('\r\n'));
    } catch (e) {
        console.error("[ERROR] Failed to write temp batch file:", e.message);
        return false;
    }

    // Run the batch file as Administrator
    const psCommand = `Start-Process -FilePath "${batPath}" -Verb RunAs -Wait -WindowStyle Hidden`;
    console.log(`[INFO] Requesting Admin privileges to update firewall rules...`);

    try {
        execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
        try { fs.unlinkSync(batPath); } catch (e) { }
        return true;
    } catch (e) {
        console.warn("[ERROR] Failed to run elevated commands.");
        try { fs.unlinkSync(batPath); } catch (e) { }
        return false;
    }
}

function checkAdmin() {
    try {
        execSync('net session', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

function applyFirewallRules() {
    console.log("[INFO] Configuring Firewall Rules...");
    const cmds = [
        `netsh advfirewall firewall set rule name="${FIREWALL_RULES.custom}" new enable=yes`,
        `netsh advfirewall firewall set rule name="${FIREWALL_RULES.node}" new enable=no`,
        `netsh advfirewall firewall set rule name="${FIREWALL_RULES.nodeExe}" new enable=no`
    ];

    if (checkAdmin()) {
        try {
            console.log(`[INFO] Enabling rule: "${FIREWALL_RULES.custom}"...`);
            execSync(cmds[0], { stdio: 'ignore' });
            console.log(`[INFO] Disabling rule: "${FIREWALL_RULES.node}"...`);
            execSync(cmds[1], { stdio: 'ignore' });
            console.log(`[INFO] Disabling rule: "${FIREWALL_RULES.nodeExe}"...`);
            execSync(cmds[2], { stdio: 'ignore' });
            console.log("[INFO] Firewall rules applied.");
        } catch (err) {
            console.warn("[ERROR] Failed to apply rules locally (Check if rules exist).");
        }
    } else {
        if (runElevatedBatch(cmds)) {
            console.log("[INFO] Firewall rules applied (Elevated).");
        }
    }
}

function revertFirewallRules() {
    console.log("\n[INFO] Reverting Firewall Rules...");
    const cmds = [
        `netsh advfirewall firewall set rule name="${FIREWALL_RULES.custom}" new enable=no`,
        `netsh advfirewall firewall set rule name="${FIREWALL_RULES.node}" new enable=yes`,
        `netsh advfirewall firewall set rule name="${FIREWALL_RULES.nodeExe}" new enable=yes`
    ];

    if (checkAdmin()) {
        try {
            execSync(cmds[0], { stdio: 'ignore' });
            execSync(cmds[1], { stdio: 'ignore' });
            execSync(cmds[2], { stdio: 'ignore' });
            console.log("[INFO] Firewall rules reverted.");
        } catch (err) {
            console.warn("[ERROR] Failed to revert rules locally.");
        }
    } else {
        runElevatedBatch(cmds);
        console.log("[INFO] Firewall rules reverted (Elevated).");
    }
}

// 2. Open Firewall
applyFirewallRules();

// 3. Start Servers
console.log(`[INIT] Starting Backend Server...`);
const serverProcess = spawn('node', ['src/index.js', currentIP], {
    stdio: 'inherit',
    shell: true
});

serverProcess.on('close', (code) => {
    console.log(`[INFO] Server stopped (${code})`);
    revertFirewallRules(); // Revert on clean exit
});

// 4. Start Frontend
console.log(`[INIT] Starting Frontend...`);
const frontendPath = path.resolve(__dirname, '../ptt-frontend');
let frontendProcess = null;

if (fs.existsSync(frontendPath)) {
    frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: frontendPath,
        stdio: 'inherit',
        shell: true
    });
    frontendProcess.on('close', (code) => {
        console.log(`[INFO] Frontend stopped with code ${code}`);
    });
} else {
    console.warn(`[WARN] Frontend folder not found at ${frontendPath}`);
}

// 5. Open Browser (Chrome -> Default)
console.log(`[INIT] Launching Browser...`);
const targetUrl = `https://${currentIP}:5173`;

function openBrowser(url) {
    const startChrome = `start chrome "${url}"`;
    const startDefault = `start "${url}"`; // Windows default open

    try {
        // Try Chrome first
        execSync(startChrome, { stdio: 'ignore' });
        console.log(`[INFO] Opened Chrome at ${url}`);
    } catch (e) {
        try {
            // Fallback to default
            console.log(`[INFO] Chrome not found/failed. Trying system default...`);
            execSync(startDefault, { stdio: 'ignore' });
            console.log(`[INFO] Opened default browser at ${url}`);
        } catch (err) {
            console.warn(`[WARN] Failed to open browser automatically. Please visit: ${url}`);
        }
    }
}

// Slight delay to ensure frontend dev server is up
setTimeout(() => openBrowser(targetUrl), 3000);

// --- Cleanup & Exit Logic ---
let isCleaningUp = false;

function performCleanup(signal) {
    if (isCleaningUp) return;
    isCleaningUp = true;

    console.log(`\n[INFO] Cleanup sequence initiated (${signal})...`);

    // 1. Kill Backend (if not already dead)
    if (serverProcess && !serverProcess.killed && signal !== 'SERVER_CLOSE') {
        try { serverProcess.kill(); } catch (e) { }
    }

    // 2. Kill Frontend (Forcefully)
    if (frontendProcess) {
        console.log("[INFO] Stopping Frontend...");
        try {
            if (process.platform === 'win32') {
                execSync(`taskkill /pid ${frontendProcess.pid} /f /t`, { stdio: 'ignore' });
            } else {
                frontendProcess.kill();
            }
        } catch (e) { }
    }

    // 3. Revert Firewall
    revertFirewallRules();

    console.log("[INFO] Cleanup complete. Exiting.");
    process.exit(0);
}

// Triggered when backend stops naturally (e.g. auto-shutdown)
serverProcess.on('close', (code) => {
    console.log(`[INFO] Server stopped (${code})`);
    performCleanup('SERVER_CLOSE');
});

// Triggered by User (Ctrl+C)
function handleExit() {
    performCleanup('SIGINT');
}
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
