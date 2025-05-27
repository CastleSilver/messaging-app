import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

function App() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  useEffect(() => {
    socket.on('receive-message', (msg) => {
      setChat((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('send-message', message);
      setMessage('');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem', fontFamily: 'Arial' }}>
      <h2>💬 Real-Time Chat</h2>
      <div style={{ border: '1px solid #ccc', height: 300, overflowY: 'auto', padding: 10 }}>
        {chat.map((msg, i) => (
          <div key={i} style={{ margin: '4px 0' }}>{msg}</div>
        ))}
      </div>
      <form onSubmit={sendMessage} style={{ marginTop: 10 }}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: '80%', padding: 8 }}
          placeholder="Type your message..."
        />
        <button type="submit" style={{ padding: 8, marginLeft: 10 }}>Send</button>
      </form>
    </div>
  );
}

export default App;
