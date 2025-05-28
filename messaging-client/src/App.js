import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

let socket;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [typingUser, setTypingUser] = useState('');

  useEffect(() => {
    if (token) {
      socket = io('http://localhost:8080', {
        auth: { token }
      });
      console.log('Token being sent to socket.io:', token);

      socket.on('receive-message', (msg) => {
        setChat((prev) => [...prev, msg]);
      });
      
      socket.on('user-typing', (username) => {
        setTypingUser(username);
      
        // Clear typing indicator after 2s
        setTimeout(() => setTypingUser(''), 2000);
      });
      
      socket.on('chat-history', (msgs) => {
        setChat(msgs);
      });

      socket.emit('get-history');

      return () => socket.disconnect();
    }
  }, [token]);

  const login = async () => {
    try {
      const res = await axios.post('http://localhost:8080/login', { username, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      alert('Login failed');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('send-message', message);
      setMessage('');
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 300, margin: '2rem auto', fontFamily: 'Arial' }}>
        <h3>🔐 Login</h3>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" /><br />
        <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><br />
        <button onClick={login}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'Arial' }}>
      <h2>💬 Welcome, {username}</h2>
      <button onClick={() => {
        localStorage.removeItem('token');
        window.location.reload();
      }}>Logout</button>
      <div style={{ border: '1px solid #ccc', height: 300, overflowY: 'auto', padding: 10 }}>
      {chat.map((msg, i) => (
        <div key={i} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
          {/* Placeholder avatar: first letter of username */}
          <div style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: '#007bff',
            color: 'white',
            textAlign: 'center',
            lineHeight: '30px',
            marginRight: 10,
            fontWeight: 'bold'
          }}>
            {msg.username[0].toUpperCase()}
          </div>
          <div>
            <strong>{msg.username}</strong>: {msg.text} <br />
            <small style={{ color: 'gray' }}>{new Date(msg.timestamp).  toLocaleTimeString()}</small>
          </div>
        </div>
      ))}
      {typingUser && <div><em>{typingUser} is typing...</em></div>}
      </div>
      <form onSubmit={sendMessage}>
        <input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            socket.emit('typing');
          }}
          style={{ width: '80%' }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
