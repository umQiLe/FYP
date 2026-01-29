const WebSocketService = require('../src/services/websocket');
const statsService = require('../src/services/statsService');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.resolve(__dirname, '../debug_log.txt');

function log(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

// Mock dependencies
jest.mock('../src/services/statsService');

// Mock WebSocket class
class MockWebSocket {
    constructor() {
        this.readyState = 1; // OPEN
        this.OPEN = 1; // Required for ws.readyState === ws.OPEN
        this.send = jest.fn();
        this.close = jest.fn();
        this.on = jest.fn();
        this.user = null;
    }
}

// Mock WebSocket Server
class MockWSS {
    constructor() {
        this.clients = new Set();
    }
}

describe('WebSocketService', () => {
    let wsService;
    let mockWss;

    beforeEach(() => {
        jest.clearAllMocks();
        mockWss = new MockWSS();
        wsService = new WebSocketService(mockWss, '127.0.0.1');
        fs.writeFileSync(LOG_FILE, ''); // Clear log
    });

    // --- Connection Tests ---
    test('should accept new connection for student', () => {
        try {
            const ws = new MockWebSocket();
            const user = { uid: 's1', email: 'student@siswa.um.edu.my' };
            wsService.handleConnection(ws, user);
            expect(wsService.clients.size).toBe(1);
            expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('system-welcome'));
        } catch (e) {
            log('FAIL accept connection: ' + e.message);
            throw e;
        }
    });

    test('should prevent second lecturer from joining', () => {
        try {
            const ws1 = new MockWebSocket();
            const user1 = { uid: 'l1', email: 'lec@um.edu.my' };
            wsService.handleConnection(ws1, user1);

            const ws2 = new MockWebSocket();
            const user2 = { uid: 'l2', email: 'lec2@um.edu.my' };
            wsService.handleConnection(ws2, user2);

            expect(ws2.close).toHaveBeenCalled();
            expect(ws2.send).toHaveBeenCalledWith(expect.stringMatching(/already/));
        } catch (e) {
            log('FAIL prevent second lecturer: ' + e.message);
            // Log calls to debug
            const calls = JSON.stringify(ws2.send.mock.calls);
            log('  Send calls: ' + calls);
            throw e;
        }
    });

    test('should close old connection on duplicate join', () => {
        try {
            const ws1 = new MockWebSocket();
            const user = { uid: 'u1', email: 'u1@test.com' };
            wsService.handleConnection(ws1, user);

            const ws2 = new MockWebSocket();
            wsService.handleConnection(ws2, user);

            expect(ws1.close).toHaveBeenCalled();
            expect(wsService.clients.get(ws2)).toBe('u1');
        } catch (e) {
            log('FAIL duplicate join: ' + e.message);
            throw e;
        }
    });

    test('should reject banned user', () => {
        try {
            const ws = new MockWebSocket();
            const user = { uid: 'banned', email: 'banned@test.com' };
            wsService.bannedUids.set('banned', user);

            wsService.handleConnection(ws, user);

            expect(ws.send).toHaveBeenCalledWith(expect.stringMatching(/kicked/));
            expect(ws.close).toHaveBeenCalled();
        } catch (e) {
            log('FAIL banned user: ' + e.message);
            const calls = JSON.stringify(ws.send.mock.calls);
            log('  Send calls: ' + calls);
            throw e;
        }
    });

    // --- PTT Flow Tests ---
    test('should grant floor on request-to-speak if free', () => {
        try {
            // 1. Setup Host
            const hostWs = new MockWebSocket();
            const hostUser = { uid: 'host', email: 'lec@um.edu.my' };
            wsService.handleConnection(hostWs, hostUser);
            wsService.handleMessage(hostWs, JSON.stringify({ type: 'register-as-host' }));

            // 2. Setup Student
            const ws = new MockWebSocket();
            const user = { uid: 'u1', name: 'U1', email: 'u1@siswa.um.edu.my' };
            wsService.handleConnection(ws, user);

            // Simulate request
            const msg = JSON.stringify({ type: 'request-to-speak' });
            wsService.handleMessage(ws, msg);

            expect(wsService.speaker).not.toBeNull();
            expect(wsService.speaker.user.uid).toBe('u1');
            expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('system-speak-granted'));
        } catch (e) {
            log('FAIL grant floor: ' + e.message);
            throw e;
        }
    });

    test('should queue request-to-speak if busy', () => {
        try {
            // 1. Setup Host
            const hostWs = new MockWebSocket();
            wsService.handleConnection(hostWs, { uid: 'host', email: 'lec@um.edu.my' });
            wsService.handleMessage(hostWs, JSON.stringify({ type: 'register-as-host' }));

            const ws1 = new MockWebSocket();
            wsService.handleConnection(ws1, { uid: 'u1', email: 'u1@siswa.um.edu.my' });

            // U1 takes floor
            wsService.handleMessage(ws1, JSON.stringify({ type: 'request-to-speak' }));

            const ws2 = new MockWebSocket();
            wsService.handleConnection(ws2, { uid: 'u2', email: 'u2@siswa.um.edu.my' });

            // U2 requests
            wsService.handleMessage(ws2, JSON.stringify({ type: 'request-to-speak' }));

            // Expect Acknowledged + Queueing
            expect(ws2.send).toHaveBeenCalledWith(expect.stringContaining('system-request-acknowledged'));
            // Expect U1 to still be speaker
            expect(wsService.speaker.user.uid).toBe('u1');
            // Expect U2 in Request Queue
            expect(wsService.requestQueue).toContain(ws2);

        } catch (e) {
            log('FAIL queue busy: ' + e.message);
            throw e;
        }
    });

    test('should release floor', () => {
        try {
            // 1. Setup Host
            const hostWs = new MockWebSocket();
            wsService.handleConnection(hostWs, { uid: 'host', email: 'lec@um.edu.my' });
            wsService.handleMessage(hostWs, JSON.stringify({ type: 'register-as-host' }));

            const ws = new MockWebSocket();
            wsService.handleConnection(ws, { uid: 'u1', email: 'u1@siswa.um.edu.my' });
            wsService.handleMessage(ws, JSON.stringify({ type: 'request-to-speak' })); // Take floor

            wsService.handleMessage(ws, JSON.stringify({ type: 'release-floor' }));

            expect(wsService.speaker).toBeNull();
        } catch (e) {
            log('FAIL release floor: ' + e.message);
            throw e;
        }
    });

    // --- Admin Tests ---
    test('admin-kick-user should ban and close socket', () => {
        try {
            // Lecturer (Admin/Host)
            const adminWs = new MockWebSocket();
            const admin = { uid: 'admin', email: 'admin@um.edu.my' };
            wsService.handleConnection(adminWs, admin);
            wsService.handleMessage(adminWs, JSON.stringify({ type: 'register-as-host' }));

            // Victim
            const victimWs = new MockWebSocket();
            const victim = { uid: 'victim', email: 'victim@siswa.um.edu.my' };
            wsService.handleConnection(victimWs, victim);

            // Kick command
            const kickMsg = JSON.stringify({
                type: 'admin-kick-user',
                payload: { uid: 'victim' }
            });
            wsService.handleMessage(adminWs, kickMsg);

            expect(victimWs.close).toHaveBeenCalled();
            expect(wsService.bannedUids.has('victim')).toBe(true);
        } catch (e) {
            log('FAIL admin kick: ' + e.message);
            throw e;
        }
    });

    test('should manage request queue (add and cancel)', () => {
        try {
            // 1. Setup Host
            const hostWs = new MockWebSocket();
            wsService.handleConnection(hostWs, { uid: 'host', email: 'lec@um.edu.my' });
            wsService.handleMessage(hostWs, JSON.stringify({ type: 'register-as-host' }));

            // 2. Setup Speaker (Floor Busy)
            const speakerWs = new MockWebSocket();
            wsService.handleConnection(speakerWs, { uid: 's1', email: 's1@siswa.um.edu.my' });
            wsService.handleMessage(speakerWs, JSON.stringify({ type: 'request-to-speak' }));

            // 3. Setup Requester
            const requesterWs = new MockWebSocket();
            wsService.handleConnection(requesterWs, { uid: 'r1', email: 'r1@siswa.um.edu.my' });

            // Action: Request to Speak (Add to Queue)
            wsService.handleMessage(requesterWs, JSON.stringify({ type: 'request-to-speak' }));

            expect(wsService.requestQueue).toContain(requesterWs);
            expect(wsService.requestQueue.length).toBe(1);
            expect(requesterWs.send).toHaveBeenCalledWith(expect.stringContaining('system-request-acknowledged'));

            // Action: Cancel Request (Remove from Queue)
            wsService.handleMessage(requesterWs, JSON.stringify({ type: 'cancel-request' }));

            expect(wsService.requestQueue).not.toContain(requesterWs);
            expect(wsService.requestQueue.length).toBe(0);
            expect(requesterWs.send).toHaveBeenCalledWith(expect.stringContaining('system-request-cancelled'));

        } catch (e) {
            log('FAIL queue management: ' + e.message);
            throw e;
        }
    });
});