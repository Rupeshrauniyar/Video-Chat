import React, {useEffect, useRef} from "react";

const App = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pcRef = useRef(null);
  const wsRef = useRef(null); // 👈 WebSocket stored in a ref
  const localStreamRef = useRef(null);
  const hasReceivedOfferRef = useRef(false);
  const clientIdRef = useRef(crypto.randomUUID()); // ✅ unique ID

  useEffect(() => {
    const socket = new WebSocket("https://video-chat-97yc.onrender.com");
    wsRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{urls: "stun:stun.l.google.com:19302"}],
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({type: "ice", candidate: event.candidate}));
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onsignalingstatechange = () => {
      console.log("Signaling state:", pc.signalingState);
    };

    navigator.mediaDevices.getUserMedia({video: true, audio: true}).then((stream) => {
      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    });

    socket.onmessage = async (message) => {
      let text = message.data instanceof Blob ? await message.data.text() : message.data;
      const data = JSON.parse(text);

      if (data.type === "offer") {
        if (!hasReceivedOfferRef.current) {
          hasReceivedOfferRef.current = true;
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsRef.current?.send(JSON.stringify({type: "answer", answer, senderId: clientIdRef.current}));
        } else {
          console.warn("Duplicate offer ignored");
        }
      }

      if (data.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      }

      if (data.type === "ice" && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("ICE Error:", e);
        }
      }
    };
  }, []);

  const startCall = async () => {
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    wsRef.current.send(JSON.stringify({type: "offer", offer, senderId: clientIdRef.current}));
  };

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <h1 className="text-xl font-bold">WebRTC Video Call (React)</h1>
      <div className="flex gap-4">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-64 rounded"
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-64 rounded"
        />
      </div>
      <button
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={startCall}>
        Start Call
      </button>
    </div>
  );
};

export default App;
