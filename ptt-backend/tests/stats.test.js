const statsService = require('../src/services/statsService');
const fs = require('fs');

// Mock fs to avoid writing to real files during tests
jest.mock('fs');
const mockSessions = { sessions: [] };

describe('Stats Service', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();

        // Reset Singleton State
        statsService.db = { sessions: [] };
        statsService.currentSessionId = null;

        mockSessions.sessions = [];
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(JSON.stringify(mockSessions));
        fs.writeFileSync.mockImplementation(() => { });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should start a new session', () => {
        const sessionId = statsService.startSession('lecturer1');
        expect(sessionId).toBeDefined();
        // startSession saves synchronously
        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('should add user to session', () => {
        const sessionId = statsService.startSession('lecturer1');

        // Update mock to have the new session
        const currentSession = {
            sessionId: sessionId,
            users: {},
            events: []
        };
        mockSessions.sessions.push(currentSession);
        fs.readFileSync.mockReturnValue(JSON.stringify(mockSessions));

        const user = { uid: 'u1', name: 'User 1', email: 'u1@test.com' };
        statsService.addUser(user);

        // Advance timer to trigger _scheduleSave
        jest.runOnlyPendingTimers();

        // Verify write was called with updated user
        // 1st call: startSession (sync)
        // 2nd call: addUser -> _scheduleSave (async)
        expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
        const writeCall = fs.writeFileSync.mock.calls[1][1];
        const parsed = JSON.parse(writeCall);
        expect(parsed.sessions[0].users['u1']).toBeDefined();
        expect(parsed.sessions[0].users['u1'].email).toBe('u1@test.com');
    });

    test('should log events', () => {
        const sessionId = statsService.startSession('lecturer1');

        // Mock the state again
        const currentSession = { sessionId: sessionId, users: {}, events: [] };
        mockSessions.sessions.push(currentSession);
        fs.readFileSync.mockReturnValue(JSON.stringify(mockSessions));

        statsService.logEvent('TEST_EVENT', 'u1', { someData: true });

        // Advance timer
        jest.runOnlyPendingTimers();

        const writeCall = fs.writeFileSync.mock.calls[1][1];
        const parsed = JSON.parse(writeCall);
        expect(parsed.sessions[0].events).toHaveLength(1);
        expect(parsed.sessions[0].events[0].type).toBe('TEST_EVENT');
    });
});