import { io, Socket } from "socket.io-client";

export type Connection = {
  name?: string;
  id: string;
  connection: RTCPeerConnection;
  in?: RTCDataChannel;
  out?: RTCDataChannel;
};

export const defaultConnectionData = {
  connections: [] as Connection[],
};

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const establishRTCConnection = async (connection: Socket, id: string) => {
  console.log("calling user: " + id);
  const peerConnection = createRTCConnection();
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
  connection.emit("call-user", {
    offer,
    to: id,
  });
  peerConnection.onicecandidate = (event) => {
    console.log("ice", event);
    if (event.candidate) {
      connection.emit("ice", {
        candidate: event.candidate,
        to: id,
      });
    }
  };

  return peerConnection;
};

const createRTCConnection = () => {
  const peerConnection = new RTCPeerConnection(configuration);

  return peerConnection;
};

export const connect = (
  id: string,
  getAllConnections: () => Connection[],
  getConnection: (id: string) => Connection | undefined,
  addConnection: (connection: Connection) => void,
  removeConnection: (id: string) => void,
) => {
  console.log(import.meta.env.VITE_SERVER_URL);
  const connection = io(import.meta.env.VITE_SERVER_URL);
  console.log("attempting connect");

  connection.on("connect", () => {
    console.log("connected");
    connection.emit("join-room", id);
  });

  connection.on("user-list", async ({ users }) => {
    console.log("users", users);
    users.forEach(async (user: string) => {
      const peer = await establishRTCConnection(connection, user);
      addConnection({ id: user, connection: peer });

      peer.onconnectionstatechange = (event) => {
        console.log("event", event);
        if (peer.connectionState === "connected") {
          console.log("connection established");
          const data = getConnection(user);
          if (data) {
            data.out = peer.createDataChannel("chat");
          }
        }
      };
      peer.ondatachannel = (event) => {
        const data = getConnection(user);
        if (data) {
          data.in = event.channel;
        }
      };
    });
  });

  connection.on("ice", async (data) => {
    console.log("ice", data);
    const connectionData = getConnection(data.socket);
    if (connectionData) {
      await connectionData.connection.addIceCandidate(data.candidate);
    } else {
      console.error(
        'connection not found, we should have connection on "ice" event',
      );
    }
  });

  connection.on("remove-user", ({ socketId }) => {
    const connectionData = getConnection(socketId);
    if (connectionData) {
      connectionData.in?.close();
      connectionData.out?.close();
      connectionData.connection.close();
    }
    removeConnection(socketId);
  });

  connection.on("call-made", async (data) => {
    console.log("call made", data);
    console.warn(
      "someone calls, perhaps we know the guy, if not, let's answer anyway",
    );
    let connectionData = getConnection(data.socket);
    if (!connectionData) {
      console.warn("we don't know the guy, let's answer anyway");
      connectionData = {
        id: data.socket,
        connection: createRTCConnection(),
      };
      addConnection(connectionData);
    }
    const peerConnection = connectionData.connection;

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer),
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    connection.emit("make-answer", {
      answer,
      to: data.socket,
    });
  });

  connection.on("answer-made", async (data) => {
    console.log("answer made", data);
    let connectionData = getConnection(data.socket);

    if (connectionData) {
      console.log("connection found, setting remote description");
      await connectionData.connection.setRemoteDescription(
        new RTCSessionDescription(data.answer),
      );
      console.log("ok, we connected to the guy, what now?");
      connectionData.connection.createDataChannel("chat");
    } else {
      console.error(
        'connection not found, we should have connection on "answer-made" event',
      );
    }
  });

  return {
    disconnect: () => {
      const connections = getAllConnections();
      connections.forEach((connection) => {
        connection.in?.close();
        connection.out?.close();
        connection.connection.close();
      });
      connection.disconnect();
    },
  };
};
