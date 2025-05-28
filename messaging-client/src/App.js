import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

let socket;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [typingUser, setTypingUser] = useState('');
  const inputRef = useRef(null);       // for autofocus
  const bottomRef = useRef(null);      // for auto scroll
  const [room, setRoom] = useState('general');
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUserId(decoded.userId);

      socket = io('http://localhost:8080', {
        auth: { token }
      });
      console.log('Token being sent to socket.io:', token);


      socket.on('receive-message', (msg) => {
        console.log(msg)
        setChat((prev) => [...prev, msg]);
      });
      
      socket.on('user-typing', (username) => {
        if (username !== localStorage.getItem('username')) {
            setTypingUser(username);
        
            // Clear after 3 seconds
            setTimeout(() => setTypingUser(null), 3000);
        }
      });
      
      socket.on('chat-history', (msgs) => {
          setChat(msgs);
        });
        
      socket.emit('get-history');
        
      socket.on('message-read', ({ messageId, userId }) => {
        setChat(prev => prev.map(msg => 
            msg._id === messageId && !msg.readBy.includes(userId)
            ? { ...msg, readBy: [...msg.readBy, userId] }
            : msg
        ));
      });
      return () => socket.disconnect();
    }
}, [token]);

  useEffect(() => {
    if (socket) {
      socket.emit('join-room', room);
      socket.emit('get-history', room); // get room-specific history
    }
  }, [room]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (!socket) return;
    chat.forEach(msg => {
        if (msg.userId !== currentUserId) {
          socket.emit('mark-read', msg._id);
        }
    });
  }, [currentUserId, chat]);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);  

  const login = async () => {
    try {
      const res = await axios.post('http://localhost:8080/login', { username, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      localStorage.setItem('username', username);
    } catch (err) {
      alert('Login failed');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('send-message', { text: message, room });
      setMessage('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername('');
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing');
  }

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
      <button onClick={handleLogout} style={{ float: 'right' }}>🚪 Logout</button>
      <h2>💬 Welcome, {username}</h2>
      <select value={room} onChange={(e) => setRoom(e.target.value)}>
        <option value="general">General</option>
        <option value="tech">Tech</option>
        <option value="marketing">Marketing</option>
      </select>
      <div style={{ border: '1px solid #ccc', height: 300, overflowY: 'auto', padding: 10 }}>
        {chat.map((msg, i) => (
          <div key={i} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', backgroundColor: '#007bff',
              color: 'white', textAlign: 'center', lineHeight: '30px', marginRight: 10, fontWeight: 'bold'
              }}>
              {msg.username[0].toUpperCase()}
            </div>
            <div>
              <strong>{msg.username}</strong>: {msg.text} <br />
              <small style={{ color: 'gray' }}>{new Date(msg.timestamp).toLocaleTimeString()}</small>
              {msg.userId === currentUserId && (
                <>
                {console.log('Rendering read state for msg:', msg)}
                <small style={{ marginLeft: 10 }}>
                  {msg.readBy.length > 1 ? '✅ Read' : '📩 Sent'}
                </small>
                </>
              )}
            </div>
          </div>
        ))}
        {typingUser && (
          <div style={{ fontStyle: 'italic', color: 'gray', marginTop: 5 }}>
            {typingUser} is typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={sendMessage}>
        <input
          ref={inputRef}
          value={message}
          onChange={handleTyping}
          style={{ width: '80%' }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
