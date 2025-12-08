const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- Route Handlers ---
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const Undorouter = require('./routes/undoRoutes');
const queueRoute = require('./routes/queueRoutes');

// --- Utilities & Models ---

// Utility to interface with the external C++ task management system
const cppBridge = require('./utils/cppBridge');

const Task = require('./models/Task');
const Queue = require('./models/Queue');

const app = express();
// Configure the port: use the environment variable PORT or default to 5000
const PORT = process.env.PORT || 5000;

// --- Application Middleware ---

// Enable Cross-Origin Resource Sharing (CORS) for front-end access
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
// Parse incoming JSON requests, making body data available in req.body
app.use(express.json());

// --- MongoDB Database Connection ---

// Connect to MongoDB using the URI specified in the environment variables
mongoose.connect(process.env.MONGODB_URI)
   .then(() => {
     console.log('MongoDB connected successfully')
   })
// Log any connection errors
.catch(err => console.error('MongoDB connection error:', err));

// --- Custom Middleware ---

// Logs HTTP method and path for every incoming request
app.use((req, res, next) => {
 console.log(`${req.method} ${req.path}`);
 next();
});

// --- API Route Definitions ---

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/undo', Undorouter);
app.use('/api/queue', queueRoute);

// --- Error Handlers ---

// 404 handler: Executes if no other route matched the incoming request
app.use((req, res) => {
   res.status(404).json({
     success: false,
     message: 'Route not found'
   });
});

// --- Server Initialization & Shutdown ---

// Start listening for incoming HTTP requests on the specified PORT
app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown mechanism: Handles SIGTERM signal (typically sent by container orchestrators like Docker/Kubernetes)
process.on('SIGTERM', () => {
   console.log('SIGTERM received, closing server...');
   // Ensure the connection to the C++ bridge is properly terminated
   const cppBridge = require('./utils/cppBridge');
   cppBridge.close();
   // Close the MongoDB database connection
   mongoose.connection.close();
   process.exit(0);
});

// --- Startup Data Synchronization ---

/**
 * Immediately Invoked Function Expression (IIFE) to load persistent queues
 * from MongoDB and synchronize their state with the C++ task management system.
 * This ensures the C++ system's memory-based queue starts with the latest data.
 */
(async function loadQueue() {
   try {
     // Fetch all queue documents from MongoDB
     const allQueues = await Queue.find({});

     // Iterate through each user's queue
     for (const queue of allQueues) {
        // Iterate through all tasks within that queue
        for (const task of queue.tasks) {
          // Call the C++ bridge to add the task back into the C++ queue structure
          await cppBridge.addToQueue(task.taskId);
        }
     }

     console.log('Processing queues synced with C++');
   } catch (err) {
     console.error('Failed to sync queues:', err);
   }
})();

module.exports = app;