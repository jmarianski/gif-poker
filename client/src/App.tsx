import {
  useSocketConnection,
  ConnectionContext,
} from "./context/connection.context";
import { Chat } from "./components/component/chat";
import "./App.css";

function App() {
  const { sendMessage, messageListener } = useSocketConnection(
    location.pathname,
  );

  return (
    <>
      <ConnectionContext.Provider value={{ sendMessage, messageListener }}>
        <Chat />
      </ConnectionContext.Provider>
    </>
  );
}

export default App;
