const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
        let mkcertCmd = null;

        const candidates = [
            path.join(__dirname, '..', 'bin', 'mkcert.exe'),
            path.join(__dirname, '..', 'bin', 'mkcert-v1.4.4-windows-amd64.exe'),
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
            throw new Error("Could not find 'mkcert.exe' or 'mkcert-v1.4.4-windows-amd64.exe'.");
        }

        const cmd = `"${mkcertCmd}" -cert-file cert.pem -key-file key.pem ${currentIP} localhost 127.0.0.1`;
        console.log(`[EXEC] ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });

        fs.writeFileSync(LAST_IP_FILE, currentIP);
        console.log(`[SUCCESS] Certificates generated for ${currentIP}`);

    } catch (e) {
        console.error(`[ERROR] Failed to generate certificates: ${e.message}`);
    }
}

// --- Main Execution ---
console.log("--------------------------------------------------");
console.log("   PTT APPLICATION - PRODUCTION MODE");
console.log("--------------------------------------------------");

const currentIP = getLocalIP();
console.log(`[INIT] Detected IP: ${currentIP}`);

// 1. Manage Certificates
ensureCertificates(currentIP);

// --- Firewall Management Functions (Simplified Inline) ---
function checkAdmin() {
    try {
        execSync('net session', { stdio: 'ignore' });
        return true;
    } catch (e) { return false; }
}

function runElevatedBatch(commands) {
    const batPath = path.join(__dirname, 'temp_fw_rules.bat');
    try { fs.writeFileSync(batPath, commands.join('\r\n')); } catch (e) { return false; }
    const psCommand = `Start-Process -FilePath "${batPath}" -Verb RunAs -Wait -WindowStyle Hidden`;
    try {
        execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
        try { fs.unlinkSync(batPath); } catch (e) { }
        return true;
    } catch (e) {
        try { fs.unlinkSync(batPath); } catch (e) { }
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
            cmds.forEach(cmd => execSync(cmd, { stdio: 'ignore' }));
            console.log("[INFO] Firewall rules applied.");
        } catch (err) { }
    } else {
        runElevatedBatch(cmds);
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
        try { cmds.forEach(cmd => execSync(cmd, { stdio: 'ignore' })); } catch (err) { }
    } else {
        runElevatedBatch(cmds);
    }
}

// 2. Open Firewall
applyFirewallRules();

// 3. Start Servers
console.log(`[INIT] Starting Backend Server (Serving Static Frontend)...`);
const serverProcess = spawn('node', ['src/index.js', currentIP], {
    stdio: 'inherit',
    shell: true
});

serverProcess.on('close', (code) => {
    console.log(`[INFO] Server stopped (${code})`);
    revertFirewallRules();
});

// 4. Open Browser (Production Port 8081)
console.log(`[INIT] Launching Browser...`);
const targetUrl = `https://${currentIP}:8081`;

function openBrowser(url) {
    const startChrome = `start chrome "${url}"`;
    const startDefault = `start "${url}"`;
    try {
        execSync(startChrome, { stdio: 'ignore' });
        console.log(`[INFO] Opened Chrome at ${url}`);
    } catch (e) {
        try {
            console.log(`[INFO] Chrome not found. Trying default...`);
            execSync(startDefault, { stdio: 'ignore' });
        } catch (err) {
            console.warn(`[WARN] Please visit: ${url}`);
        }
    }
}

setTimeout(() => openBrowser(targetUrl), 2000);

// --- Cleanup & Exit Logic ---
let isCleaningUp = false;
function performCleanup(signal) {
    if (isCleaningUp) return;
    isCleaningUp = true;
    console.log(`\n[INFO] Cleanup sequence initiated (${signal})...`);

    if (serverProcess && !serverProcess.killed && signal !== 'SERVER_CLOSE') {
        try { serverProcess.kill(); } catch (e) { }
    }
    revertFirewallRules();
    process.exit(0);
}

function handleExit() { performCleanup('SIGINT'); }
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
