
const statsService = require('./statsService');

class WebSocketService {
  constructor(wss, serverIP) {
    this.wss = wss;
    this.serverIP = serverIP;
    this.clients = new Map(); // Map<ws, uid>
    this.speaker = null;
    this.speakQueue = [];
    this.requestQueue = []; // Array of ws clients
    this.hostWs = null;
    this.isSessionActive = false;

    this.bannedUids = new Map(); // Map<uid, userObject>
    this.lastSpeakTimeMap = new Map(); // Map<uid, timestamp>
    this.shutdownTimer = null; // System shutdown timer


  }

  send(ws, data) {
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  broadcast(data) {
    this.wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        this.send(client, data);
      }
    });
  }

  broadcastSpeakerUpdate() {
    const speakerInfo = this.speaker ? this.speaker.user : null;
    this.broadcast({
      type: 'system-speaker-update',
      payload: { speaker: speakerInfo }
    });
  }

  broadcastParticipantList() {
    if (!this.hostWs) return;

    // Convert Map entries to array of user objects
    const participants = [];
    for (const [ws, uid] of this.clients.entries()) {
      if (ws.user && ws !== this.hostWs) {
        participants.push({
          uid: ws.user.uid,
          email: ws.user.email,
          name: ws.user.name,
          picture: ws.user.picture
        });
      }
    }

    this.send(this.hostWs, {
      type: 'system-participant-list',
      payload: { participants }
    });
  }

  broadcastRequestQueue() {
    if (!this.hostWs) return;

    const queue = this.requestQueue.map(ws => ({
      uid: ws.user.uid,
      name: ws.user.name,
      email: ws.user.email,
      picture: ws.user.picture
    }));

    this.send(this.hostWs, {
      type: 'system-request-queue',
      payload: { queue }
    });

  }

  // Helper to find a WebSocket client by their User ID
  findClientByUid(uid) {
    for (const [client, clientUid] of this.clients.entries()) {
      if (clientUid === uid && client.readyState === client.OPEN) {
        return client;
      }
    }
    return null;
  }

  handleConnection(ws, user) {
    // 1. Check if Banned
    if (this.bannedUids.has(user.uid)) {
      console.warn(`[WARN] [Blocked] Banned/Kicked user tried to rejoin: ${user.email}`);
      this.send(ws, { type: 'system-error', payload: 'You have been kicked from this session.' });
      ws.close();
      return;
    }

    // 2. Check for Duplicates (Force Single Session)
    const existingClient = this.findClientByUid(user.uid);
    if (existingClient) {

      existingClient.close();
      this.clients.delete(existingClient);
    }

    // 3. Single Lecturer Constraint
    const isLecturer = user.email.endsWith('@um.edu.my') || user.email.endsWith('@gmail.com');
    if (isLecturer) {
      // Check if ANY other client is a lecturer
      for (const [client, uid] of this.clients.entries()) {
        const clientUser = client.user;
        if (clientUser && (clientUser.email.endsWith('@um.edu.my') || clientUser.email.endsWith('@gmail.com'))) {
          console.warn(`[WARN] [Blocked] Second lecturer attempted to join: ${user.email}`);
          this.send(ws, { type: 'system-error', payload: 'A lecturer is already in the session. Only one lecturer is allowed.' });
          ws.close();
          return;
        }
      }
    }

    ws.user = user;
    this.clients.set(ws, user.uid);


    // Listen immediately
    ws.on('message', (message) => this.handleMessage(ws, message));
    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (error) => console.error(`[ERROR] [Error] ${user.email}:`, error));

    this.send(ws, {
      type: 'system-session-status',
      payload: { active: this.isSessionActive }
    });

    this.send(ws, {
      type: 'system-welcome',
      payload: { user, serverIP: this.serverIP }
    });

    const currentSpeaker = this.speaker ? this.speaker.user : null;
    this.send(ws, { type: 'system-speaker-update', payload: { speaker: currentSpeaker } });

    // Update Host with new list
    this.broadcastParticipantList();

    // Re-send queue if reconnecting host
    if (ws === this.hostWs) {
      this.broadcastRequestQueue();
    }

    // [Stats] Log User Join
    if (!isLecturer) { // Only log students
      statsService.addUser(user);
    }
  }


  // ** Signaling Handler **
  handleMessage(ws, message) {
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch (e) { return; }

    const { type, payload } = parsed;

    switch (type) {
      case 'register-as-host':
        // Cancel Shutdown if reconnecting
        if (this.shutdownTimer) {

          clearTimeout(this.shutdownTimer);
          this.shutdownTimer = null;
        }

        this.hostWs = ws;
        this.isSessionActive = true;


        // [Stats] Start or Resume Session (Prevents data wipe on refresh)
        if (ws.user && ws.user.uid) {
          statsService.startOrResumeSession(ws.user.uid);

          // Backfill existing connected students into the new session stats
          // Otherwise they speak but don't count as "Users" in the report
          for (const [client, uid] of this.clients.entries()) {
            if (client !== ws && client.user) {
              // Ensure we respect the role check (don't add other potential admins/hosts if any)
              // Using the same logic as handleConnection
              const isClientLecturer = client.user.email.endsWith('@um.edu.my') || client.user.email.endsWith('@gmail.com');
              if (!isClientLecturer) {
                statsService.addUser(client.user);
              }
            }
          }
        }
        this.broadcast({ type: 'system-session-status', payload: { active: true } });
        this.broadcastParticipantList();
        this.broadcastRequestQueue();
        break;

      case 'speaking-started':
        if (this.speaker === ws) {
          statsService.logEvent('SPEAK_PULSE', ws.user.uid);
        }
        break;

      case 'request-to-speak':
        if (!this.isSessionActive) return;
        // [Stats] Log Request
        statsService.logEvent('REQUEST_TO_SPEAK', ws.user.uid);
        this.handleRequestToSpeak(ws);
        break;

      case 'cancel-request':
        this.handleCancelRequest(ws);
        break;

      case 'finished-speaking':
        this.handleFinishedSpeaking(ws);
        break;

      case 'release-floor':
        this.handleReleaseFloor(ws);
        break;

      case 'admin-kick-user':
        if (ws === this.hostWs) {
          this.handleAdminKick(payload.uid);
        }
        break;

      case 'admin-remove-request':
        if (ws === this.hostWs) {
          this.handleAdminRemoveRequest(payload.uid);
        }
        break;

      case 'admin-toggle-session':
        if (ws === this.hostWs) {
          this.isSessionActive = payload.active;
          this.broadcast({ type: 'system-session-status', payload: { active: this.isSessionActive } });

        }
        break;

      case 'admin-release-floor':
        if (ws === this.hostWs) {

          if (this.speaker) {
            this.lastSpeakTimeMap.set(this.speaker.user.uid, Date.now()); // Apply cooldown
          }
          this.speaker = null;
          this.broadcastSpeakerUpdate();
        }
        break;

      case 'admin-unkick-user':
        if (ws === this.hostWs) {

          if (this.bannedUids.has(payload.uid)) {
            this.bannedUids.delete(payload.uid);
            this.broadcastBannedList();
          }
        }
        break;

      case 'admin-grant-floor':
        if (ws === this.hostWs) {
          const targetUid = payload.uid;
          const targetClient = this.findClientByUid(targetUid);
          if (targetClient) {
            // Force release current speaker if any
            this.speaker = targetClient;
            this.send(targetClient, { type: 'system-speak-granted' });
            this.broadcastSpeakerUpdate();
          }
        }
        break;

      // --- WEBRTC SIGNALING ---

      case 'webrtc-offer':
        // Student -> Host
        if (this.hostWs) {

          this.send(this.hostWs, {
            type: 'webrtc-offer',
            payload: payload,
            from: ws.user.uid
          });
        } else {
          console.warn(`[WARN] [WebRTC] Dropped OFFER from ${ws.user.email} - No Host`);
        }
        break;

      case 'webrtc-answer':
        // Host -> Specific Student
        if (ws === this.hostWs && payload.targetUid) {
          const targetClient = this.findClientByUid(payload.targetUid);
          if (targetClient) {

            this.send(targetClient, {
              type: 'webrtc-answer',
              payload: payload.sdp
            });
          } else {
            console.warn(`[WARN] [WebRTC] Dropped ANSWER - Target ${payload.targetUid} not found`);
          }
        }
        break;

      case 'webrtc-ice-candidate':
        // A. Host -> Specific Student
        if (ws === this.hostWs && payload.targetUid) {
          const targetClient = this.findClientByUid(payload.targetUid);
          if (targetClient) {
            this.send(targetClient, {
              type: 'webrtc-ice-candidate',
              payload: payload.candidate
            });
          }
        }
        // B. Student -> Host
        else if (this.hostWs) {
          this.send(this.hostWs, {
            type: 'webrtc-ice-candidate',

            payload: payload.candidate,
            from: ws.user.uid
          });
        }
        break;
      // --- LATENCY MON ---
      case 'ping':
        this.send(ws, { type: 'pong' });
        break;

      case 'latency-update':
        if (ws.user && ws.user.uid) {
          statsService.addLatencySample(ws.user.uid, payload.rtt);
        }
        break;

      case 'webrtc-stats':
        if (ws.user && ws.user.uid) {
          // payload: { rtt, jitter, packetLoss }
          statsService.addWebRTCSample(ws.user.uid, payload);
        }
        break;

    }
  }

  handleDisconnect(ws) {
    if (!ws.user) return;
    if (ws === this.hostWs) {
      console.error("[ERROR] [Host] Host disconnected!");
      this.hostWs = null;
      this.isSessionActive = false; // Optional: Reset session
      this.broadcast({ type: 'system-session-status', payload: { active: false } });
      statsService.endSession();

      // Auto-Shutdown Trigger

      if (this.shutdownTimer) clearTimeout(this.shutdownTimer);
      this.shutdownTimer = setTimeout(() => {

        process.exit(0);
      }, 10000);
    }
    this.clients.delete(ws);
    // Auto-release floor on disconnect
    if (this.speaker === ws) {

      this.lastSpeakTimeMap.set(ws.user.uid, Date.now()); // Record timestamp
      this.speaker = null;
      this.broadcastSpeakerUpdate();
    }
    // Remove from request queue
    if (this.requestQueue.includes(ws)) {
      this.requestQueue = this.requestQueue.filter(c => c !== ws);
      this.broadcastRequestQueue();
    }
    this.speakQueue = this.speakQueue.filter(client => client !== ws);
    this.broadcastParticipantList(); // Update host
  }

  handleRequestToSpeak(ws) {
    if (!this.hostWs) {
      this.send(ws, { type: 'system-error', payload: 'Lecturer disconnected.' });
      return;
    }

    // Concurrent Speaker Check
    if (this.speaker === null) {
      this.grantMic(ws);
    } else if (this.speaker === ws) {
      this.send(ws, { type: 'system-speak-granted' });
      statsService.logEvent('SPEAK_PULSE', ws.user.uid);
    } else {
      // Floor is busy, add to queue
      if (!this.requestQueue.includes(ws)) {
        this.requestQueue.push(ws);
        this.broadcastRequestQueue();
        this.send(ws, { type: 'system-request-acknowledged' });
      }

      // Notify the Host (Legacy toast, but queue update is primary now)
      if (this.hostWs) {
        this.send(this.hostWs, {
          type: 'system-student-request',
          payload: {
            uid: ws.user.uid,
            name: ws.user.name,
            email: ws.user.email
          }
        });
      }
    }
  }

  handleCancelRequest(ws) {
    if (this.requestQueue.includes(ws)) {
      this.requestQueue = this.requestQueue.filter(c => c !== ws);
      this.broadcastRequestQueue();
      this.send(ws, { type: 'system-request-cancelled' });
    }
  }

  handleAdminRemoveRequest(uid) {
    const client = this.findClientByUid(uid);
    if (client) {
      this.requestQueue = this.requestQueue.filter(c => c !== client);
      this.broadcastRequestQueue();
      this.send(client, { type: 'system-request-removed' });
    } else {
      // Just in case they are not found but in queue (stale state)
      // Clean up queue
      this.requestQueue = this.requestQueue.filter(c => c.user.uid !== uid);
      this.broadcastRequestQueue();
    }
  }

  handleReleaseFloor(ws) {
    if (this.speaker === ws) {

      this.lastSpeakTimeMap.set(ws.user.uid, Date.now());

      // [Stats] Log Floor Released
      statsService.logEvent('FLOOR_RELEASED', ws.user.uid);

      // Console Log for Demo


      this.speaker = null;
      this.broadcastSpeakerUpdate();
    }
  }

  grantMic(ws) {
    this.speaker = ws;
    // Remove from queue if they get the mic
    if (this.requestQueue.includes(ws)) {
      this.requestQueue = this.requestQueue.filter(c => c !== ws);
      this.broadcastRequestQueue();
    }

    this.send(ws, { type: 'system-speak-granted' });

    // [Stats] Log Granted
    statsService.logEvent('SPEAK_GRANTED', ws.user.uid);

    this.broadcastSpeakerUpdate();
  }

  handleFinishedSpeaking(ws) {
    // does NOT release the floor. 
    if (this.speaker === ws) {

      // [Stats] Log Finished Speaking
      statsService.logEvent('SPEAK_FINISHED', ws.user.uid);
    }
  }

  handleAdminKick(targetUid) {
    const targetClient = this.findClientByUid(targetUid);

    // Add to Ban List (Store Info)
    if (targetClient && targetClient.user) {
      this.bannedUids.set(targetUid, {
        uid: targetClient.user.uid,
        name: targetClient.user.name,
        email: targetClient.user.email,
        picture: targetClient.user.picture
      });
    }

    this.broadcastBannedList();

    if (targetClient) {

      this.send(targetClient, { type: 'system-error', payload: 'You have been kicked by the lecturer.' });

      // Force cleanup if they were speaking
      if (this.speaker === targetClient) {
        this.speaker = null;
        this.broadcastSpeakerUpdate();
      }

      targetClient.close();
    }
  }

  broadcastBannedList() {
    if (!this.hostWs) return;
    const bannedList = Array.from(this.bannedUids.values());
    this.send(this.hostWs, {
      type: 'system-banned-list',
      payload: { bannedList }
    });
  }



}

module.exports = WebSocketService;