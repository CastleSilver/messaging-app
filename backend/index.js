const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User'); // your User model
const Message = require('./models/Message');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const server = http.createServer(app); // Create HTTP server
const cors = require('cors');
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', // frontend
    credentials: true
  }));

// DB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.error('MongoDB error:', err));


// --- Basic API routes here (register, login, etc.) ---

app.get('/', (req, res) => {
  res.send('Hello from the messaging backend!');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword });
      await user.save();
      res.status(201).send('User created');
    } catch (err) {
      console.error(err);
      res.status(400).send('Error creating user');
    }
});

  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const user = await User.findOne({ username });
      if (!user) return res.status(401).send('Invalid credentials');
  
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).send('Invalid credentials');
  
      const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).send('Login error');
    }
});
    
// ✅ New: Handle WebSocket events
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
  
    if (!token) {
      return next(new Error('No token provided'));
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded); // check what's inside
      socket.user = decoded; // Now you can use socket.user.username
      next();
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      next(new Error('Authentication failed'));
    }
});
  
io.on('connection', (socket) => {
    console.log(`✅ ${socket.user.username} connected`);
    socket.on('join-room', async (room) => {
        if (socket.room) {
            socket.leave(socket.room);
        }
        socket.join(room);
        socket.room = room;
      
        const messages = await Message.find({ room }).sort({ timestamp: 1 }).limit(50);
        socket.emit('chat-history', messages);
    });

    socket.on('send-message', async ({ text, room }) => {
      try {
        const targetRoom = room || socket.room || 'general';
        const msg = new Message({
          text,
          username: socket.user.username,
          userId: socket.user.userId,
          timestamp: new Date(),
          room: room || socket.room || 'general',
          readBy: [socket.user.userId],
        });
        await msg.save();
        io.to(targetRoom).emit('receive-message', msg);
      } catch (err) {
        console.error('Message send error:', err);
      }
    });

    socket.on('get-history', async () => {
        const room = socket.room || 'general';
        const messages = await Message.find({ room }).sort({ timestamp: 1 }).limit(50);
        socket.emit('chat-history', messages);
    });

    socket.on('typing', () => {
        if (socket.user?.username) {
            const room = socket.room || 'general';
            socket.to(room).emit('user-typing', socket.user.username);
        }
    });

    socket.on('mark-read', async (messageId) => {
        try {
          const userId = socket.user.userId;
          const msg = await Message.findById(messageId);
      
          if (!msg) return;
      
          if (!msg.readBy.includes(userId)) {
            msg.readBy.push(userId);
            await msg.save();

            io.to(msg.room).emit('message-read', {
                messageId,
                userId
            });
          }
        } catch (err) {
          console.error('Error marking message as read:', err);
        }
    });
});
  
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  