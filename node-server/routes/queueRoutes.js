const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const cppBridge = require('../utils/cppBridge');
const Task = require('../models/Task');
const Queue = require('../models/Queue');

const queueRoute = express.Router();
queueRoute.use(verifyToken);

// Helper: Get or create user's queue
async function getUserQueue(userId) {
  let queue = await Queue.findOne({ userId });
  if (!queue) {
    queue = new Queue({ userId, tasks: [] });
    await queue.save();
  }
  return queue;
}

// ============================================
// ADD TASK TO PROCESSING QUEUE
// DESCRIPTION: Adds a task to the user's processing queue if it's TO_DO (0) or PENDING (1) status.
// SUCCESS RESPONSE:
// res.json({
//     success: true,
//     message: "Task added to processing queue",
//     queueSize: 1,      // total number of tasks in queue after adding
//     position: 1        // position of the task in the queue (FIFO)
// })
// PATH:  POST /api/queue/add/:taskId
// ============================================
queueRoute.post('/add/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // Verify task exists and belongs to user
    const task = await Task.findOne({ taskId, userId: req.userId });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only TO_DO (0) or PENDING (1) tasks can be queued
    if (task.status !== 0 && task.status !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Only TO_DO or PENDING tasks can be added to queue'
      });
    }

    // Get user's queue from MongoDB
    const queue = await getUserQueue(req.userId);

    // Check if task already in queue
    const alreadyQueued = queue.tasks.some(t => t.taskId === taskId);
    if (alreadyQueued) {
      return res.status(400).json({
        success: false,
        message: 'Task is already in the queue'
      });
    }

    // Add to MongoDB queue
    queue.tasks.push({
      taskId: taskId,
      addedAt: new Date()
    });
    await queue.save();

    // Add to C++ queue
    await cppBridge.addToQueue(taskId);

    res.json({
      success: true,
      message: 'Task added to processing queue',
      queueSize: queue.tasks.length,
      position: queue.tasks.length
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to add task to queue',
      error: err.message
    });
  }
});

// ============================================
// PROCESS NEXT TASK (Dequeue)
// DESCRIPTION: Removes the first task in the user's queue (FIFO) and marks it as IN_PROGRESS.
// SUCCESS RESPONSE:
// res.json({
//     success: true,
//     message: "Started working on task",
//     task: task,               // the full task object after updating status
//     remainingInQueue: 2       // number of tasks left in the queue
// })
// PATH:  POST /api/queue/next
// ============================================
queueRoute.post('/next', async (req, res) => {
  try {
    // Get user's queue from MongoDB
    const queue = await getUserQueue(req.userId);

    if (queue.tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Processing queue is empty'
      });
    }

    // Get first task from queue
    const queuedTask = queue.tasks.shift(); // Remove first (FIFO)
    await queue.save();

    // Process in C++ queue
    const cppResult = await cppBridge.processNextTask(req.userId);

    // Update status in MongoDB
    const task = await Task.findOneAndUpdate(
      { taskId: queuedTask.taskId },
      { status: 2 }, // IN_PROGRESS
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Started working on task',
      task: task,
      remainingInQueue: queue.tasks.length
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to process next task',
      error: err.message
    });
  }
});

// ============================================
// VIEW PROCESSING QUEUE
// DESCRIPTION: Returns a list of all tasks in the user's queue along with their details and position.
// SUCCESS RESPONSE:
// res.json({
//   success: true,
//   queueSize: 1,               // total number of tasks in queue
//   isEmpty: false,             // true if queue is empty
//   queue: [
//       {
//         position: 1,          // FIFO position
//         taskId: "44fcbe9ac84d190f",
//         addedAt: "2025-12-07T21:24:41.701Z",
//         task: {
//           title: "Task Title",
//           description: "Task description",
//           priority: 2,
//           status: 0,
//           dueDate: "2025-12-08T00:00:00.000Z"
//         }
//       }
//   ]
// })
// PATH:  GET /api/queue
// ============================================
queueRoute.get('/', async (req, res) => {
  try {
    const queue = await getUserQueue(req.userId);

    // Get full task details for each queued task
    const taskIds = queue.tasks.map(t => t.taskId);
    const tasks = await Task.find({ taskId: { $in: taskIds } });

    // Map tasks with queue position
    const queueWithDetails = queue.tasks.map((queueItem, index) => {
      const task = tasks.find(t => t.taskId === queueItem.taskId);
      return {
        position: index + 1,
        taskId: queueItem.taskId,
        addedAt: queueItem.addedAt,
        task: task ? {
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate
        } : null
      };
    });

    res.json({
      success: true,
      queueSize: queue.tasks.length,
      isEmpty: queue.tasks.length === 0,
      queue: queueWithDetails
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// CLEAR ENTIRE QUEUE
// DESCRIPTION: Removes all tasks from the user's queue.
// SUCCESS RESPONSE:
// res.json({
//     success: true,
//     message: "Cleared 2 tasks from queue"  // number of tasks removed
// })
// PATH:  DELETE /api/queue/clear
// ============================================
queueRoute.delete('/clear', async (req, res) => {
  try {
    const queue = await getUserQueue(req.userId);
    const clearedCount = queue.tasks.length;
    
    queue.tasks = [];
    await queue.save();

    res.json({
      success: true,
      message: `Cleared ${clearedCount} tasks from queue`
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// GET QUEUE STATUS
// DESCRIPTION: Returns information about the user's queue and C++ queue status.
// SUCCESS RESPONSE:
// res.json({
//     success: true,
//     queueSize: 1,               // number of tasks in user's MongoDB queue
//     isEmpty: false,             // true if queue is empty
//     hasNext: true,              // true if there is a next task to process
//     nextTask: "44fcbe9ac84d190f", // taskId of next task
//     cppQueueSize: 0             // number of tasks in C++ queue
// })
// PATH:  GET /api/queue/status
// ============================================
queueRoute.get('/status', async (req, res) => {
  try {
    const queue = await getUserQueue(req.userId);

    // Get C++ queue status too
    const cppResult = await cppBridge.getQueueStatus(req.userId);

    res.json({
      success: true,
      queueSize: queue.tasks.length,
      isEmpty: queue.tasks.length === 0,
      hasNext: queue.tasks.length > 0,
      nextTask: queue.tasks.length > 0 ? queue.tasks[0].taskId : null,
      cppQueueSize: cppResult.queueSize
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// PEEK NEXT TASK (without removing)
// DESCRIPTION: Returns details of the next task in queue without removing it.
// SUCCESS RESPONSE:
// res.json({
//     success: true,
//     message: "Next task in queue",
//     task: task,               // full task object of the next task
//     position: 1,              // position in the queue (always 1 for next)
//     remainingInQueue: 1       // total tasks remaining in queue
// })
// PATH:  GET /api/queue/peek
// ============================================
queueRoute.get('/peek', async (req, res) => {
  try {
    const queue = await getUserQueue(req.userId);

    if (queue.tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Queue is empty'
      });
    }

    const nextTaskId = queue.tasks[0].taskId;
    const nextTask = await Task.findOne({ taskId: nextTaskId });

    res.json({
      success: true,
      message: 'Next task in queue',
      task: nextTask,
      position: 1,
      remainingInQueue: queue.tasks.length
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = queueRoute;