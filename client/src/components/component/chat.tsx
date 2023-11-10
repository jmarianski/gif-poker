import { ConnectionContext } from "../../context/connection.context";
import { useContext, useEffect, useState } from "react";
import { Connection } from "../../socket";

export const Chat = () => {
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const { sendMessage, messageListener } = useContext(ConnectionContext);
  useEffect(() => {
    if (!messageListener) return;
    const onClose = messageListener((connection: Connection, message: any) => {
      setChatHistory((prev) => [...prev, { id: connection.id, message }]);
    });
    return () => {
      onClose();
    };
  }, [messageListener]);

  return (
    <div>
      <div>
        {chatHistory.map((history) => {
          return (
            <div key={history.id}>
              {history.id} (): {history.message}
            </div>
          );
        })}
      </div>
      <input
        type="text"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage && sendMessage(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
      />
    </div>
  );
};
