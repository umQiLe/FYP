import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock the AudioWorkletProcessor Environment
class MockAudioWorkletProcessor {
    constructor() {
        this.port = { postMessage: vi.fn() };
    }
}
global.AudioWorkletProcessor = MockAudioWorkletProcessor;
global.currentTime = 0; // Mock Web Audio API global time

// 2. Capture the class when registerProcessor is called
let RegisteredClass = null;
global.registerProcessor = vi.fn((name, cls) => {
    RegisteredClass = cls;
});

// 3. Load and Execute the REAL script file
const scriptPath = path.resolve(__dirname, '../../public/vad-processor.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// This 'eval' executes the script in this scope, forcing it to use our mocks
// and trigger our 'registerProcessor' implementation.
eval(scriptContent);

// 4. Use the captured class for testing
const VadProcessor = RegisteredClass;

// --- TESTS ---

describe('VAD Processor Algorithm', () => {
    let vad;
    let inputBuffer;
    let outputBuffer;

    // Helper to create a buffer filled with value
    const createBuffer = (val, length = 128) => {
        const arr = new Float32Array(length).fill(val);
        return [[arr]]; // Channel 0
    };

    beforeEach(() => {
        vad = new VadProcessor();
        inputBuffer = [new Float32Array(128)];
        outputBuffer = [new Float32Array(128)];
    });

    it('should stay closed on silence (RMS < minThreshold)', () => {
        const silentInput = createBuffer(0.001); // Very quiet
        vad.process(silentInput, outputBuffer);
        expect(vad.isOpen).toBe(false);
    });

    it('should open on sudden loud noise (> threshold)', () => {
        // First establish silence
        vad.process(createBuffer(0.001), outputBuffer);

        // Sudden loud noise
        const loudInput = createBuffer(0.2);
        vad.process(loudInput, outputBuffer);

        expect(vad.isOpen).toBe(true);
        expect(vad.holdCounter).toBe(vad.holdTime);
    });

    it('should hold open for holdTime after signal drops', () => {
        // Open it first
        vad.process(createBuffer(0.001), outputBuffer);
        vad.process(createBuffer(0.2), outputBuffer);
        expect(vad.isOpen).toBe(true);

        // Now silence
        const silentInput = createBuffer(0.001);

        // Process one block, should still be open due to hold
        vad.process(silentInput, outputBuffer);
        expect(vad.isOpen).toBe(true);
        expect(vad.holdCounter).toBe(vad.holdTime - 1);

        // Fast forward almost to end
        vad.holdCounter = 1;
        vad.process(silentInput, outputBuffer);
        expect(vad.isOpen).toBe(true);
        expect(vad.holdCounter).toBe(0);

        // Next one closes it
        vad.process(silentInput, outputBuffer);
        expect(vad.isOpen).toBe(false);
    });
});