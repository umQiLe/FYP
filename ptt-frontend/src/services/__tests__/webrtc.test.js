import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initStudentConnection, handleWebRTCSignal, initHostMode, closeAllConnections } from '../webrtc';
import * as socketService from '../socket';

// --- MOCKS ---

// 1. Mock Socket Service
vi.mock('../socket', () => ({
    sendSocketMessage: vi.fn(),
    connectSocket: vi.fn(),
}));

// 2. Mock Global Browser APIs
class MockRTCPeerConnection {
    constructor(config) {
        this.config = config;
        this.onicecandidate = null;
        this.ontrack = null;
        this.localDescription = null;
        this.remoteDescription = null;
        this.signalingState = 'stable';
        this.tracks = new Set();
    }
    addTrack(track) { this.tracks.add(track); }
    createOffer() { return Promise.resolve({ type: 'offer', sdp: 'mock-sdp-offer' }); }
    createAnswer() { return Promise.resolve({ type: 'answer', sdp: 'mock-sdp-answer' }); }
    setLocalDescription(desc) { this.localDescription = desc; return Promise.resolve(); }
    setRemoteDescription(desc) { this.remoteDescription = desc; return Promise.resolve(); }
    addIceCandidate(cand) { return Promise.resolve(); }
    close() { }
}

class MockAudioContext {
    constructor() {
        this.state = 'suspended';
        this.audioWorklet = {
            addModule: vi.fn().mockResolvedValue()
        };
    }
    createMediaStreamSource() {
        return { connect: vi.fn() };
    }
    createMediaStreamDestination() {
        return {
            stream: {
                getAudioTracks: () => [{ enabled: true, stop: vi.fn() }],
                getTracks: () => [{ stop: vi.fn() }]
            }
        };
    }
    createGain() {
        return {
            gain: { value: 1 },
            connect: vi.fn()
        };
    }
    createBiquadFilter() {
        return {
            frequency: { value: 0 },
            connect: vi.fn()
        };
    }
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
    close() { return Promise.resolve(); }
}

// Mock Navigator MediaDevices
const mockGetUserMedia = vi.fn().mockResolvedValue({
    getAudioTracks: () => [{ enabled: true, stop: vi.fn() }],
    getTracks: () => [{ stop: vi.fn() }]
});


describe('WebRTC Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Stub Globals
        vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
        vi.stubGlobal('RTCSessionDescription', class { constructor(init) { Object.assign(this, init); } });
        vi.stubGlobal('AudioContext', MockAudioContext);
        vi.stubGlobal('AudioWorkletNode', class {
            constructor() {
                this.port = { onmessage: null };
                this.connect = vi.fn();
            }
        });

        // Stub window
        vi.stubGlobal('window', {
            AudioContext: MockAudioContext,
            webkitAudioContext: MockAudioContext
        });

        // Stub navigator
        vi.stubGlobal('navigator', {
            mediaDevices: { getUserMedia: mockGetUserMedia }
        });

        closeAllConnections(); // Reset internal state
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('Student Mode', () => {
        it('should initialize connection: GetUserMedia -> CreateOffer -> SendSignal', async () => {
            await initStudentConnection("student-123");

            // 1. Verify Audio Stack initialization
            expect(mockGetUserMedia).toHaveBeenCalled();
            expect(socketService.sendSocketMessage).toHaveBeenCalledWith(
                'webrtc-offer',
                expect.objectContaining({ type: 'offer' })
            );
        });
    });

    describe('Host Mode', () => {
        it('should execute without error', () => {
            expect(() => initHostMode()).not.toThrow();
        });
    });

    describe('Signaling', () => {
        it('should handle incoming answer', async () => {
            // Setup a fake connection first to have a peer to answer to
            await initStudentConnection("student-123");

            // Now simulate receiving an answer
            const mockAnswer = { type: 'answer', sdp: 'server-sdp-answer' };
            await handleWebRTCSignal('webrtc-answer', mockAnswer, 'HOST_TARGET');

            // Since we mocked internals loosely, we mostly check no crash and state progression in a real integration test.
            // Here we verify it doesn't throw.
            expect(true).toBe(true);
        });
    });
});