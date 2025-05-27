const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User'); // your User model
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend requests for now (can restrict later)
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

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
  
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).send('Login error');
    }
  });
    
// ✅ New: Handle WebSocket events
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
  
    socket.on('send-message', (message) => {
      console.log('📩 Message received:', message);
      io.emit('receive-message', message); // broadcast to all clients
    });
  
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });
  
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  