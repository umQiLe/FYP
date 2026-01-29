import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectSocket, sendSocketMessage, closeSocket } from '../socket';

// Mock the WebSocket global
class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.send = vi.fn();
        this.close = vi.fn(() => {
            this.readyState = 3; // CLOSED
            if (this.onclose) this.onclose({ code: 1000, reason: 'Normal Closure' });
        });

        // Simulate connection delay
        setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this.onopen) this.onopen();
        }, 10);
    }
}

describe('Socket Service', () => {
    beforeEach(() => {
        // Stub WebSocket
        vi.stubGlobal('WebSocket', MockWebSocket);
        MockWebSocket.OPEN = 1;

        // Stub window.location
        vi.stubGlobal('window', {
            location: {
                protocol: 'https:',
                hostname: 'localhost',
                host: 'localhost:8081'
            }
        });
        vi.useFakeTimers();
    });

    afterEach(() => {
        closeSocket();
        vi.clearAllMocks();
        vi.unstubAllGlobals(); // Restore
        vi.useRealTimers();
    });

    it('should connect using the correct URL', () => {
        const onOpen = vi.fn();
        const token = "test-token";
        const ws = connectSocket(token, null, null, onOpen, null);

        expect(ws).toBeDefined();
        expect(ws.url).toContain("wss://localhost:8081?token=test-token");
    });

    it('should trigger onOpen callback when connected', async () => {
        const onOpen = vi.fn();
        connectSocket("token", null, null, onOpen, null);

        // Fast-forward timers to handle the setTimeout in MockWebSocket
        await vi.advanceTimersByTimeAsync(20);

        expect(onOpen).toHaveBeenCalled();
    });

    it('should send a message if open', async () => {
        const ws = connectSocket("token", null, null, null, null);
        await vi.advanceTimersByTimeAsync(20); // Wait for open

        sendSocketMessage('test-type', { foo: 'bar' });

        expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
            type: 'test-type',
            payload: { foo: 'bar' }
        }));
    });

    it('should parse incoming JSON messages', async () => {
        const onMessage = vi.fn();
        const ws = connectSocket("token", onMessage, null, null, null);
        await vi.advanceTimersByTimeAsync(20);

        // Simulate incoming message
        const msg = { type: 'hello', payload: 'world' };
        ws.onmessage({ data: JSON.stringify(msg) });

        expect(onMessage).toHaveBeenCalledWith(msg);
    });

    it('should handle ping/pong internally without triggering generic callback', async () => {
        const onMessage = vi.fn();
        const ws = connectSocket("token", onMessage, null, null, null);
        await vi.advanceTimersByTimeAsync(20);

        // Simulate PONG
        ws.onmessage({ data: JSON.stringify({ type: 'pong' }) });

        // Should NOT call the user handler
        expect(onMessage).not.toHaveBeenCalled();
    });

    it('should trigger onDisconnect on close', async () => {
        const onDisconnect = vi.fn();
        const ws = connectSocket("token", null, onDisconnect, null, null);
        await vi.advanceTimersByTimeAsync(20);

        // Simulate Close
        ws.close();

        expect(onDisconnect).toHaveBeenCalled();
    });
});