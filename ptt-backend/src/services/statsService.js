// src/services/statsService.js
const fs = require('fs');
const path = require('path');


// Simple UUID generator if uuid package isn't available
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure sessions file exists
if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: [] }, null, 2));
}

class StatsService {
    constructor() {
        this.currentSessionId = null;
        this.db = this._loadInitialData();
        this.saveTimer = null;
    }

    // --- Helper: Read/Write ---

    _loadInitialData() {
        try {
            if (!fs.existsSync(SESSIONS_FILE)) {
                return { sessions: [] };
            }
            const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error("[ERROR] [Stats] Read error:", err);
            return { sessions: [] };
        }
    }

    _scheduleSave() {
        if (this.saveTimer) return;
        this.saveTimer = setTimeout(() => {
            this._performSave();
            this.saveTimer = null;
        }, 5000);
    }

    _performSave() {
        try {
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify(this.db, null, 2));

        } catch (err) {
            console.error("[ERROR] [Stats] Write error:", err);
        }
    }

    // --- Session Management ---

    startSession(lecturerId) {

        return this.startOrResumeSession(lecturerId);
    }

    startOrResumeSession(lecturerId) {
        // 1. Check if there is an existing ACTIVE or RECENTLY CLOSED session
        const existingRec = this.db.sessions[this.db.sessions.length - 1];

        if (existingRec && existingRec.lecturerId === lecturerId) {
            // Check if active (endTime is null) OR recently closed (< 5 mins ago)
            const isRecent = existingRec.endTime
                ? (Date.now() - new Date(existingRec.endTime).getTime() < 10 * 1000)
                : true;

            if (isRecent) {

                existingRec.endTime = null; // Re-open if closed
                this.currentSessionId = existingRec.sessionId;
                this._performSave();
                return this.currentSessionId;
            }
        }

        // 2. Otherwise start NEW
        const newSession = {
            sessionId: generateId(),
            lecturerId,
            startTime: new Date().toISOString(),
            endTime: null,
            users: {},
            events: [],
            latencySamples: [],
            webrtcSamples: [],
            createdAt: new Date().toISOString()
        };

        // Keep only CURRENT session data (overwrite for fresh start)
        this.db.sessions = [newSession];
        this._performSave();

        this.currentSessionId = newSession.sessionId;

        return this.currentSessionId;
    }

    endSession() {
        if (!this.currentSessionId) return;

        const session = this.db.sessions.find(s => s.sessionId === this.currentSessionId);

        if (session) {
            session.endTime = new Date().toISOString();
            this._performSave(); // Immediate save for session end

        }

        this.currentSessionId = null;
    }

    // --- User Management ---

    addUser(user) {
        if (!this.currentSessionId) return;
        const session = this.db.sessions.find(s => s.sessionId === this.currentSessionId);

        if (session) {
            if (!session.users) session.users = {};
            // Only add if new or update needed
            session.users[user.uid] = {
                name: user.name,
                email: user.email,
                joinedAt: new Date().toISOString()
            };

            session.events.push({
                type: 'JOIN',
                uid: user.uid,
                timestamp: Date.now()
            });
            this._scheduleSave();
        }
    }

    // --- Event Logging ---

    logEvent(type, uid, data = {}) {
        if (!this.currentSessionId) return;
        const session = this.db.sessions.find(s => s.sessionId === this.currentSessionId);

        if (session) {
            const event = {
                type,
                uid,
                timestamp: Date.now(),
                ...data
            };
            session.events.push(event);
            this._scheduleSave();
        }
    }

    // --- Latency Logging ---

    addLatencySample(uid, rtt) {
        if (!this.currentSessionId) return;
        const session = this.db.sessions.find(s => s.sessionId === this.currentSessionId);

        if (session) {
            if (!session.latencySamples) session.latencySamples = [];
            session.latencySamples.push({
                uid,
                rtt,
                timestamp: Date.now()
            });
            this._scheduleSave();
        }
    }

    addWebRTCSample(uid, stats) {
        if (!this.currentSessionId) return;
        const session = this.db.sessions.find(s => s.sessionId === this.currentSessionId);

        if (session) {
            if (!session.webrtcSamples) session.webrtcSamples = [];
            session.webrtcSamples.push({
                uid,
                ...stats,
                timestamp: Date.now()
            });
            this._scheduleSave();
        }
    }

    // --- Stats Calculation ---

    getSessionStats(sessionId = this.currentSessionId) {
        if (!sessionId) return null;
        const session = this.db.sessions.find(s => s.sessionId === sessionId);

        if (!session) return null;

        return this.calculateMetrics(session);
    }

    // Same metric calculation logic as before
    calculateMetrics(data) {
        const { users, events, latencySamples, webrtcSamples } = data;
        const userIds = Object.keys(users || {});
        const totalUsers = userIds.length;

        const speakerStats = {}; // { uid: { count: 0, duration: 0 } }
        const speakStarts = {}; // { uid: timestamp }

        (events || []).forEach(event => {
            if (event.type === 'SPEAK_PULSE') {
                if (!speakerStats[event.uid]) speakerStats[event.uid] = { count: 0, duration: 0, data: users[event.uid] };
                speakerStats[event.uid].count += 1;
                speakStarts[event.uid] = event.timestamp;
            }

            if ((event.type === 'SPEAK_FINISHED' || event.type === 'FLOOR_RELEASED') && speakStarts[event.uid]) {
                const start = speakStarts[event.uid];
                const duration = (event.timestamp - start) / 1000;

                if (!speakerStats[event.uid]) speakerStats[event.uid] = { count: 0, duration: 0, data: users[event.uid] };

                speakerStats[event.uid].duration += duration;

                delete speakStarts[event.uid];
            }
        });

        const uniqueSpeakers = Object.keys(speakerStats).length;
        const participationRate = totalUsers > 0 ? (uniqueSpeakers / totalUsers) * 100 : 0;
        const contributions = Object.values(speakerStats).sort((a, b) => b.duration - a.duration);
        const ghosts = userIds.filter(uid => !speakerStats[uid]).map(uid => users[uid]);

        let totalDuration = 0;
        let totalSpeaks = 0;
        contributions.forEach(c => {
            totalDuration += c.duration;
            totalSpeaks += c.count;
        });
        const avgSpeakingDuration = totalSpeaks > 0 ? totalDuration / totalSpeaks : 0;

        let totalRequests = 0;
        let totalGrants = 0;
        (events || []).forEach(e => {
            if (e.type === 'REQUEST_TO_SPEAK') totalRequests++;
            if (e.type === 'SPEAK_GRANTED') totalGrants++;
        });
        const dropOffRate = totalRequests > 0 ? ((totalRequests - totalGrants) / totalRequests) * 100 : 0;

        // --- WebRTC Metrics ---
        let audioLatencySum = 0;
        let audioLatencyCount = 0;
        let maxJitter = 0;

        (webrtcSamples || []).forEach(s => {
            if (s.rtt) {
                audioLatencySum += s.rtt;
                audioLatencyCount++;
            }
            if (s.jitter && s.jitter > maxJitter) {
                maxJitter = s.jitter;
            }
        });

        const avgAudioLatency = audioLatencyCount > 0 ? audioLatencySum / audioLatencyCount : 0;

        // --- detailed student stats ---
        const studentPerformance = userIds.map(uid => {
            const stats = speakerStats[uid] || { count: 0, duration: 0 };
            return {
                uid,
                name: users[uid] ? users[uid].name : 'Unknown',
                email: users[uid] ? users[uid].email : '-',
                speakCount: stats.count,
                totalDuration: stats.duration.toFixed(1),
                avgDuration: stats.count > 0 ? (stats.duration / stats.count).toFixed(1) : "0.0",
                engagementScore: Math.round((stats.count * 5) + stats.duration)
            };
        }).sort((a, b) => b.engagementScore - a.engagementScore);

        return {
            sessionId: data.sessionId,
            startTime: data.startTime,
            endTime: data.endTime,
            totalUsers,
            activeUsers: uniqueSpeakers,
            participationRate: participationRate.toFixed(1),
            avgSpeakingDuration: avgSpeakingDuration.toFixed(1),
            dropOffRate: dropOffRate.toFixed(1),
            topContributors: contributions.slice(0, 5),
            studentPerformance,
            ghostUsers: ghosts,
            events: events || [],
            latencySamples: latencySamples || [],
            webrtcSamples: webrtcSamples || [],
            avgAudioLatency: avgAudioLatency.toFixed(1),
            maxJitter: maxJitter.toFixed(3)
        };
    }
}

module.exports = new StatsService();
