import { useState } from "react";
import { Auth } from "./components/Auth";
import { Chat } from "./components/Chat";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <div className={user ? "app-shell app-shell-chat" : "app-shell app-shell-auth"}>
      {!user ? (
        <Auth onLogin={(email, tok) => { setUser(email); setToken(tok); }} />
      ) : (
        <Chat email={user} token={token} onLogout={logout} />
      )}
    </div>
  );
}
