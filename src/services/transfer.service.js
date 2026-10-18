// ==============================================================================
// Altrivelle Linker — Adaptive Transfer Engine
// Developed by ALTRIVELLE TECHNOLOGIES
// Modes: Persistent Cloud (A), Ephemeral Self-Destruct (B), Direct P2P WebRTC (C)
// ==============================================================================

import { getSupabase } from '../lib/supabase.js';

export const TRANSFER_MODES = {
  PERSISTENT: 'persistent', // Mode A: Object Storage + Database Link
  EPHEMERAL: 'ephemeral',   // Mode B: Self-Destruct Short Lifecycle
  P2P: 'p2p',               // Mode C: Direct Browser-to-Browser WebRTC
};

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export const adaptiveTransferService = {
  // Recommend the best mode based on file size, network, and privacy criteria
  recommendMode({
    fileSize = 0,
    isRecipientOnline = false,
    requiresLongTerm = false,
    highPrivacy = false,
  }) {
    if (isRecipientOnline && (highPrivacy || fileSize > 150 * 1024 * 1024)) {
      return {
        mode: TRANSFER_MODES.P2P,
        title: 'Direct Device-to-Device (WebRTC)',
        badge: 'Zero Cloud Storage',
        explanation: 'The recipient is currently connected. Transferring peer-to-peer bypasses server storage completely and guarantees end-to-end data residency.',
        pros: ['No storage quota consumed', 'End-to-end direct transit', 'Zero cloud logging'],
        cons: ['Sender browser must stay open until transfer finishes'],
      };
    }

    if (!requiresLongTerm && (highPrivacy || fileSize < 50 * 1024 * 1024)) {
      return {
        mode: TRANSFER_MODES.EPHEMERAL,
        title: 'Ephemeral Self-Destruct Share',
        badge: 'Automated Purge',
        explanation: 'Recommended for single-use or temporary deliverables. The file will automatically delete from storage upon download or after 24 hours.',
        pros: ['Automated file destruction', 'Enforces strict time window', 'Minimizes exposure'],
        cons: ['Cannot be recovered after expiration period'],
      };
    }

    return {
      mode: TRANSFER_MODES.PERSISTENT,
      title: 'Persistent Cloud Sharing',
      badge: 'High Reliability',
      explanation: 'Stores file in your private encrypted cloud bucket. Generate revocable links, password protect, and share asynchronously anytime.',
      pros: ['Asynchronous access 24/7', 'Full version & access control', 'Multi-recipient support'],
      cons: ['Counts against account storage quota'],
    };
  },

  // Calculate cryptographic SHA-256 integrity hash for Trust Passport
  async calculateSHA256(fileOrBlob) {
    if (!crypto || !crypto.subtle) {
      throw new Error('Web Cryptography API is not available in this environment');
    }

    const buffer = await fileOrBlob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(digest));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  },
};

// ==============================================================================
// Industrial WebRTC P2P Transfer Manager
// Cross-device browser-to-browser direct tunneling via Supabase Realtime + BroadcastChannel
// ==============================================================================
export class P2PTransferManager {
  constructor() {
    this.activePc = null;
    this.activeChannel = null;
    this.supabaseChannel = null;
    this.broadcastChannel = null;
    this.currentRoomCode = null;
    this.isHost = false;
  }

  // Generate 6-character room code (e.g. ALT-8492)
  generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ALT-${code}`;
  }

  // Clean up active connections
  cleanup() {
    if (this.activeChannel) {
      try { this.activeChannel.close(); } catch (_) {}
      this.activeChannel = null;
    }
    if (this.activePc) {
      try { this.activePc.close(); } catch (_) {}
      this.activePc = null;
    }
    if (this.supabaseChannel) {
      try {
        const supabase = getSupabase();
        supabase.removeChannel(this.supabaseChannel);
      } catch (_) {}
      this.supabaseChannel = null;
    }
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch (_) {}
      this.broadcastChannel = null;
    }
    this.currentRoomCode = null;
  }

  // Signaling setup
  setupSignaling(roomCode, onMessage) {
    this.currentRoomCode = roomCode;

    // 1. Setup local BroadcastChannel for same-origin tabs/windows
    try {
      this.broadcastChannel = new BroadcastChannel(`altrivelle_p2p_${roomCode}`);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data) onMessage(event.data);
      };
    } catch (_) {}

    // 2. Setup Supabase Realtime Broadcast for remote cross-device signaling
    try {
      const supabase = getSupabase();
      this.supabaseChannel = supabase.channel(`p2p:${roomCode}`, {
        config: { broadcast: { self: false } },
      });

      this.supabaseChannel.on('broadcast', { event: 'signal' }, (payload) => {
        if (payload?.payload) {
          onMessage(payload.payload);
        }
      });

      this.supabaseChannel.subscribe();
    } catch (err) {
      console.warn('[P2P Signaling] Supabase Realtime unavailable, using BroadcastChannel:', err);
    }
  }

  sendSignal(signal) {
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(signal); } catch (_) {}
    }
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'signal',
          payload: signal,
        });
      } catch (_) {}
    }
  }

  // HOST / SENDER SESSION
  startSenderSession({ roomCode, file, onStatus, onProgress, onComplete, onError }) {
    this.cleanup();
    this.isHost = true;

    onStatus?.('waiting', 'Room initialized. Waiting for recipient to connect...');

    this.setupSignaling(roomCode, async (signal) => {
      try {
        if (signal.type === 'join') {
          onStatus?.('connecting', 'Recipient detected. Creating direct WebRTC tunnel...');
          await this.initiateHostPeer(file, onStatus, onProgress, onComplete, onError);
        } else if (signal.type === 'answer') {
          if (this.activePc) {
            await this.activePc.setRemoteDescription(new RTCSessionDescription(signal.data));
          }
        } else if (signal.type === 'candidate') {
          if (this.activePc && signal.data) {
            await this.activePc.addIceCandidate(new RTCIceCandidate(signal.data)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[P2P Sender Error]:', err);
        onError?.(err);
      }
    });
  }

  async initiateHostPeer(file, onStatus, onProgress, onComplete, onError) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.activePc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ type: 'candidate', data: event.candidate });
      }
    };

    // Create reliable ordered data channel
    const dc = pc.createDataChannel('altrivelle-transfer', { ordered: true });
    this.activeChannel = dc;
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => {
      onStatus?.('connected', 'WebRTC DataChannel established! Transferring file...');
      this.streamFileOverDataChannel(file, dc, onStatus, onProgress, onComplete, onError);
    };

    dc.onerror = (err) => {
      console.error('[DataChannel Host Error]:', err);
      onError?.(err);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal({ type: 'offer', data: offer });
  }

  async streamFileOverDataChannel(file, dc, onStatus, onProgress, onComplete, onError) {
    try {
      // 1. Send metadata header
      const meta = JSON.stringify({
        type: 'meta',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      });
      dc.send(meta);

      // 2. Stream in 32KB chunks with flow control
      const CHUNK_SIZE = 32 * 1024; // 32 KB
      let offset = 0;
      const totalSize = file.size;
      const startTime = performance.now();

      const sendNextChunk = () => {
        while (offset < totalSize) {
          // Prevent buffer congestion (WebRTC threshold usually 1MB - 4MB)
          if (dc.bufferedAmount > 512 * 1024) {
            setTimeout(sendNextChunk, 20);
            return;
          }

          const slice = file.slice(offset, offset + CHUNK_SIZE);
          const reader = new FileReader();

          reader.onload = (e) => {
            if (dc.readyState !== 'open') return;
            dc.send(e.target.result);
            offset += slice.size;

            const elapsedSec = (performance.now() - startTime) / 1000;
            const speedBytes = elapsedSec > 0 ? offset / elapsedSec : 0;
            const speedMBps = (speedBytes / (1024 * 1024)).toFixed(2);
            const percent = Math.min(100, Math.round((offset / totalSize) * 100));

            onProgress?.({
              sentBytes: offset,
              totalBytes: totalSize,
              percent,
              speedMBps,
            });

            if (offset >= totalSize) {
              dc.send(JSON.stringify({ type: 'done' }));
              onStatus?.('completed', 'File transferred directly to recipient!');
              onComplete?.({ fileName: file.name, fileSize: totalSize });
            } else {
              sendNextChunk();
            }
          };

          reader.readAsArrayBuffer(slice);
          return;
        }
      };

      sendNextChunk();
    } catch (err) {
      onError?.(err);
    }
  }

  // RECEIVER / CLIENT SESSION
  startReceiverSession({ roomCode, onStatus, onProgress, onFileReceived, onError }) {
    this.cleanup();
    this.isHost = false;

    onStatus?.('connecting', `Joining room ${roomCode} & seeking sender...`);

    let fileMeta = null;
    let receivedBytes = 0;
    const chunks = [];
    let startTime = 0;

    this.setupSignaling(roomCode, async (signal) => {
      try {
        if (signal.type === 'offer') {
          onStatus?.('connecting', 'Sender found. Negotiating WebRTC peer connection...');

          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          this.activePc = pc;

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              this.sendSignal({ type: 'candidate', data: event.candidate });
            }
          };

          pc.ondatachannel = (event) => {
            const dc = event.channel;
            this.activeChannel = dc;
            dc.binaryType = 'arraybuffer';

            dc.onopen = () => {
              onStatus?.('connected', 'Direct WebRTC tunnel established. Receiving data...');
              startTime = performance.now();
            };

            dc.onmessage = (msgEvent) => {
              // String message: metadata or completion
              if (typeof msgEvent.data === 'string') {
                try {
                  const parsed = JSON.parse(msgEvent.data);
                  if (parsed.type === 'meta') {
                    fileMeta = parsed;
                    receivedBytes = 0;
                    chunks.length = 0;
                    onStatus?.('transferring', `Receiving "${fileMeta.fileName}"...`);
                  } else if (parsed.type === 'done') {
                    // Finalize blob and deliver
                    const blob = new Blob(chunks, { type: fileMeta?.mimeType || 'application/octet-stream' });
                    onStatus?.('completed', 'File received successfully!');
                    onFileReceived?.({
                      blob,
                      fileName: fileMeta?.fileName || 'downloaded-file',
                      fileSize: fileMeta?.fileSize || blob.size,
                    });
                  }
                } catch (_) {}
                return;
              }

              // Binary chunk
              if (msgEvent.data instanceof ArrayBuffer) {
                chunks.push(msgEvent.data);
                receivedBytes += msgEvent.data.byteLength;

                const total = fileMeta?.fileSize || receivedBytes;
                const percent = Math.min(100, Math.round((receivedBytes / total) * 100));
                const elapsedSec = (performance.now() - startTime) / 1000;
                const speedBytes = elapsedSec > 0 ? receivedBytes / elapsedSec : 0;
                const speedMBps = (speedBytes / (1024 * 1024)).toFixed(2);

                onProgress?.({
                  receivedBytes,
                  totalBytes: total,
                  percent,
                  speedMBps,
                  fileName: fileMeta?.fileName,
                });

                if (fileMeta?.fileSize && receivedBytes >= fileMeta.fileSize) {
                  const blob = new Blob(chunks, { type: fileMeta?.mimeType || 'application/octet-stream' });
                  onStatus?.('completed', 'File received successfully!');
                  onFileReceived?.({
                    blob,
                    fileName: fileMeta?.fileName || 'downloaded-file',
                    fileSize: fileMeta?.fileSize || blob.size,
                  });
                }
              }
            };

            dc.onerror = (err) => {
              console.error('[DataChannel Client Error]:', err);
              onError?.(err);
            };
          };

          await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignal({ type: 'answer', data: answer });
        } else if (signal.type === 'candidate') {
          if (this.activePc && signal.data) {
            await this.activePc.addIceCandidate(new RTCIceCandidate(signal.data)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('[P2P Receiver Error]:', err);
        onError?.(err);
      }
    });

    // Send join announcement to host
    setTimeout(() => {
      this.sendSignal({ type: 'join', roomCode });
    }, 100);

    // Keep pinging join every 1.5s until connected
    const joinInterval = setInterval(() => {
      if (this.activeChannel && this.activeChannel.readyState === 'open') {
        clearInterval(joinInterval);
      } else {
        this.sendSignal({ type: 'join', roomCode });
      }
    }, 1500);
  }
}

export const p2pTransferService = new P2PTransferManager();
