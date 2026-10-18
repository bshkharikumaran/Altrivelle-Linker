// ==============================================================================
// Altrivelle Linker — Adaptive Transfer Engine
// Developed by ALTRIVELLE TECHNOLOGIES
// Modes: Persistent Cloud (A), Ephemeral Self-Destruct (B), Direct P2P WebRTC (C)
// ==============================================================================

export const TRANSFER_MODES = {
  PERSISTENT: 'persistent', // Mode A: Object Storage + Database Link
  EPHEMERAL: 'ephemeral',   // Mode B: Self-Destruct Short Lifecycle
  P2P: 'p2p',               // Mode C: Direct Browser-to-Browser WebRTC
};

export const adaptiveTransferService = {
  // Recommend the best mode based on file size, network, and privacy criteria
  recommendMode({
    fileSize = 0,
    isRecipientOnline = false,
    requiresLongTerm = false,
    highPrivacy = false,
  }) {
    // 1. If recipient is actively online and high privacy or huge file (>150MB), recommend Direct P2P
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

    // 2. If short-term exchange or sensitive file, recommend Ephemeral
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

    // 3. Default to Persistent Cloud Sharing
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

  // Initialize WebRTC P2P Data Channel for Direct Transfer
  createPeerConnection(isInitiator, onSignal, onProgress, onComplete, onError) {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    };

    const pc = new RTCPeerConnection(config);
    let dataChannel = null;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSignal({ type: 'candidate', candidate: event.candidate });
      }
    };

    if (isInitiator) {
      dataChannel = pc.createDataChannel('altrivelle-transfer', {
        ordered: true,
      });
      setupDataChannel(dataChannel);
    } else {
      pc.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel(dataChannel);
      };
    }

    function setupDataChannel(channel) {
      channel.binaryType = 'arraybuffer';
      channel.onopen = () => {
        console.log('[Altrivelle P2P] WebRTC DataChannel Opened');
      };
      channel.onerror = (err) => {
        if (onError) onError(err);
      };
      channel.onclose = () => {
        console.log('[Altrivelle P2P] WebRTC DataChannel Closed');
      };
    }

    return { pc, dataChannel };
  },
};
