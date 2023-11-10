import React, { useEffect, useRef } from "react";
import { connect, Connection } from "../socket";

type ConnectionContextProps = {
  sendMessage?: (message: string) => void;
  messageListener?: (
    callback: (connection: Connection, message: string) => void,
  ) => () => void;
};

export const ConnectionContext = React.createContext<ConnectionContextProps>(
  {},
);

const useSocketConnection = (id: string) => {
  const connectionsRef = useRef<Connection[]>([]);

  const addConnection = (connection: Connection) => {
    connectionsRef.current.push(connection);
  };
  console.log(connectionsRef.current);

  const removeConnection = (id: string) => {
    const index = connectionsRef.current.findIndex(
      (connection) => connection.id === id,
    );
    connectionsRef.current.splice(index, 1);
  };

  const getConnection = (id: string) => {
    console.log(connectionsRef.current);
    return connectionsRef.current.find((connection) => connection.id === id);
  };

  const getAllConnections = () => {
    console.log(connectionsRef.current);
    return connectionsRef.current;
  };

  const sendMessage = (message: string) => {
    connectionsRef.current.forEach((connection) => {
      connection.out?.send(message);
    });
  };

  const messageListener = (
    callback: (connection: Connection, message: string) => void,
  ) => {
    const listeners = [] as Array<() => void>;
    connectionsRef.current.forEach((connection) => {
      if (connection.in?.readyState === "open") {
        const listener = (event: MessageEvent) => {
          callback(connection, event.data);
        };

        connection.in.addEventListener("message", listener);
        listeners.push(() => {
          connection.in?.removeEventListener("message", listener);
        });
      }
    });

    return () => {
      listeners.forEach((listener) => {
        listener();
      });
    };
  };

  useEffect(() => {
    const connection = connect(
      id,
      getAllConnections,
      getConnection,
      addConnection,
      removeConnection,
    );

    return () => {
      connection.disconnect();
    };
  }, []);

  return { connections: connectionsRef.current, sendMessage, messageListener };
};

export { useSocketConnection };
