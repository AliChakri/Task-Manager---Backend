const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const cppBridge = require('../utils/cppBridge');
const Task = require('../models/Task');
const Stack = require('../models/Stack');
const moment = require('moment');
const crypto = require('crypto');

const router = express.Router();

// Middleware to ensure all routes in this file are protected
// All task operations require a valid user token.
router.use(verifyToken);

// ============================================
//  CREATE TASK
// DESCRIPTION: Handles the creation of a new task.
// PROCESS: 1. Validate input. 2. Generate unique ID. 3. Call C++ system to create task.
//          4. Save the task details to MongoDB. 5. Record the CREATE action for Undo/Redo (Stack).
// SUCCESS RESPONSE:
// {
// "success": true,
//   "message": "Task created successfully",
//   "data": newTask // The newly created task object
// }
// PATH:  POST /api/tasks
// ============================================
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, status, tags, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Generate unique taskId
    const taskId = crypto.randomBytes(8).toString('hex');

    const taskData = {
      taskId,
      title: title.trim(),
      description: description || '',
      priority: priority || 1,
      tags: tags || [],
      status: status || 0,
      userId: req.userId,
      dueDate: dueDate || null
    };

    // 1️⃣ Create task in C++
    const cppResult = await cppBridge.createTask(taskData);
    if (!cppResult.success) return res.status(400).json(cppResult);

    // 2️⃣ Save task in MongoDB
    const dbTask = new Task({ ...taskData, status: cppResult.data.status });
    await dbTask.save();

    // 3️⃣ Push CREATE to undo stack
    let stack = await Stack.findOne({ userId: req.userId });
    if (!stack) stack = new Stack({ userId: req.userId, stack: [] });

    stack.stack.push({
      type: 'CREATE',
      taskId: taskId,
      previousState: null,
      newState: { ...dbTask.toObject() },
      timestamp: new Date()
    });

    if (stack.stack.length > 20) stack.stack.shift();
    await stack.save();

    res.status(201).json({ success: true, message: 'Task created', data: dbTask });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create task', error: err.message });
  }
});

// ============================================
//  GET ALL TASKS
// DESCRIPTION: Fetches all tasks belonging to the authenticated user, sorted by creation date (newest first).
// SUCCESS RESPONSE:
// res.json({
//   success: true,
//   count: tasks.length,
//   data: tasks // Array of all task objects
// });
// PATH:  GET /api/tasks
// ============================================
router.get('/', async (req, res) => {
  try {
    // Fetch from MongoDB
    const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: err.message
    });
  }
});

// ============================================
//   GET TASKS STATS (Overall Summary)
// DESCRIPTION: Provides key summary statistics (Total, Completed, Created This Month).
// SUCCESS RESPONSE:
 // return res.json({
 //   success: true,
 //   message: 'Task statistics fetched successfully',
 //   data: {
 //     totalTasks,
 //     completedTasks, // Tasks with status 3 (COMPLETED)
 //     tasksThisMonth // Tasks created since the 1st of the current month
 //   }
// });
// PATH:  GET /api/tasks/stats
// ============================================
router.get('/stats' ,async (req, res) => {
  try {
    const userId = req.userId; // provided by your auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user ID found'
      });
    }

    // === 1️⃣ Total tasks ===
    const totalTasks = await Task.countDocuments({ userId });

    // === 2️⃣ Completed tasks ===
    const completedTasks = await Task.countDocuments({
      userId,
      status: 3 // COMPLETED
    });

    // === 3️⃣ Tasks created this month ===
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const tasksThisMonth = await Task.countDocuments({
      userId,
      createdAt: { $gte: firstDayOfMonth }
    });

    return res.json({
      success: true,
      message: 'Task statistics fetched successfully',
      data: {
        totalTasks,
        completedTasks,
        tasksThisMonth
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task statistics',
      error: err.message
    });
  }
});

// ============================================
//  GET FAVOURITE TASKS
// DESCRIPTION: Fetches all tasks marked as favorites by the authenticated user.
// SUCCESS RESPONSE:
// res.json({
//   success: true,
//   count: tasks.length,
//   data: tasks // Array of favorite task objects
// });
// PATH:  GET /api/tasks/favorites
// ============================================
router.get('/favorites', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId, isFavorite: true });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
//  GET TASK STATUS STATS (for Doughnut Chart)
// DESCRIPTION: Calculates the count of tasks for each status category (To Do, Pending, In Progress, Completed).
// SUCCESS RESPONSE:
// return res.json({
//   success: true,
//   message: "Task status stats fetched successfully",
//   data: {
// todo, // Status 0
// pending, // Status 1
// inProgress, // Status 2
// completed // Status 3
//   }
// });
// PATH:  GET /api/tasks/status-stats
// ============================================
router.get('/status-stats', async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware
    console.log(req.user);
    

    const tasks = await Task.find({ userId });

    if (!tasks || tasks.length === 0) {
      return res.json({
        success: true,
        message: "No tasks found",
        data: {
          todo: 0,
          pending: 0,
          inProgress: 0,
          completed: 0
        }
      });
    }

    let todo = 0;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;

    tasks.forEach(task => {
      switch (task.status) {
        case 0:
          todo++;
          break;
        case 1:
          pending++;
          break;
        case 2:
          inProgress++;
          break;
        case 3:
          completed++;
          break;
      }
    });

    return res.json({
      success: true,
      message: "Task status stats fetched successfully",
      data: {
        todo,
        pending,
        inProgress,
        completed
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch status stats",
      error: err.message
    });
  }
});

// ============================================
//   GET WEEK STATUS TASK (for Line Chart)
// DESCRIPTION: Aggregates the number of tasks completed each day of the current week (Mon-Sun).
// SUCCESS RESPONSE:
// res.json({
//   success: true,
//   data: result // Array of objects: [{ day: "Mon", completed: X }, ...]
// });
// PATH:  GET /api/tasks/week-stats
// ============================================
router.get('/week-stats', async (req, res) => {
  try {
    const startOfWeek = moment().startOf("isoWeek").toDate();
    const endOfWeek = moment().endOf("isoWeek").toDate();

    const tasks = await Task.aggregate([
      {
        $match: {
          status: 3, // COMPLETED
          createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const result = week.map((day, index) => {
      let mongoDay = index + 2;
      if (mongoDay === 8) mongoDay = 1;

      const found = tasks.find(t => t._id === mongoDay);
      return {
        day,
        completed: found ? found.count : 0
      };
    });

    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================================
// SEARCH TASKS BY TITLE
// DESCRIPTION: Allows users to search their tasks by title (case-insensitive).
//              Returns tasks that contain the search string in their title.
// SUCCESS RESPONSE:
// res.json({
//   success: true,
//   count: Number,        // Number of matched tasks
//   data: tasks           // Array of task objects
// });
// PATH:  GET /api/tasks/search?title=yourSearchTerm
// QUERY PARAMS:
// title: string (required) - the title text to search for
// ============================================
router.get('/search', async (req, res) => {
  try {
    const userId = req.userId;
    const { title } = req.query;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title query parameter is required'
      });
    }

    const tasks = await Task.find({
      userId,
      title: { $regex: title.trim(), $options: 'i' }
    }).sort({ dueDate: 1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to search tasks',
      error: err.message
    });
  }
});

// ============================================
// CLEAR ALL TASKS
// DESCRIPTION: Deletes all tasks belonging to the authenticated user.
// SUCCESS RESPONSE:
// res.json({
//   success: true,
//   deletedCount: Number, // Number of tasks deleted
//   message: "All tasks cleared successfully"
// });
// PATH:  POST /api/tasks/clear
// ============================================
router.post('/clear', async (req, res) => {
  try {
    const userId = req.userId; // Auth middleware should provide this

    // Delete all tasks for the current user
    const result = await Task.deleteMany({ userId });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: 'All tasks cleared successfully'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear tasks',
      error: err.message
    });
  }
});

// ============================================
// GET SINGLE TASK
    // res.json({
    //   success: true,
    //   data: task
// });
// PATH:  GET /api/tasks/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;

    // Fetch from MongoDB
    const task = await Task.findOne({ taskId, userId: req.userId });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: err.message
    });
  }
});

// ============================================
//  UPDATE TASK
// DESCRIPTION: Modifies an existing task's details.
// PROCESS: 1. Fetch current state (for undo). 2. Update in MongoDB. 3. Update in C++ system.
//          4. Record the UPDATE action for Undo (Stack).
// SUCCESS RESPONSE:
//     // res.json({
//     //   success: true,
//     //   message: 'Task updated successfully',
//     //   data: task // The updated task object
// // });
//   // PATH:  PUT /api/tasks/:id
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;

    const oldTask = await Task.findOne({ taskId, userId: req.userId });
    if (!oldTask) return res.status(404).json({ success: false, message: 'Task not found' });

    // 1️⃣ Update in Mongo
    const task = await Task.findOneAndUpdate(
      { taskId, userId: req.userId },
      updateData,
      { new: true }
    );

    // 2️⃣ Update in C++
    await cppBridge.updateTask(taskId, updateData);

    // 3️⃣ Push UPDATE to undo stack
    let stack = await Stack.findOne({ userId: req.userId });
    if (!stack) stack = new Stack({ userId: req.userId, stack: [] });

    stack.stack.push({
      type: 'UPDATE',
      taskId,
      previousState: { ...oldTask.toObject() },
      newState: { ...task.toObject() },
      timestamp: new Date()
    });

    if (stack.stack.length > 20) stack.stack.shift();
    await stack.save();

    res.json({ success: true, message: 'Task updated', data: task });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update task', error: err.message });
  }
});

// ============================================
//   DELETE TASK
// DESCRIPTION: Removes a task permanently.
// PROCESS: 1. Find task (for undo). 2. Delete from MongoDB. 3. Delete from C++ system.
//          4. Record the DELETE action for Undo/Redo (Stack).
// SUCCESS RESPONSE:
//     // res.json({
//     //   success: true,
//     //   message: 'Task deleted successfully'
// // });
//     // PATH:  DELETE /api/tasks/:id
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findOne({ taskId, userId: req.userId });

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // 1️⃣ Delete in Mongo
    await Task.deleteOne({ taskId, userId: req.userId });

    // 2️⃣ Delete in C++
    await cppBridge.deleteTask(taskId);

    // 3️⃣ Push DELETE to undo stack
    let stack = await Stack.findOne({ userId: req.userId });
    if (!stack) stack = new Stack({ userId: req.userId, stack: [] });

    stack.stack.push({
      type: 'DELETE',
      taskId,
      previousState: { ...task.toObject() },
      newState: null,
      timestamp: new Date()
    });

    if (stack.stack.length > 20) stack.stack.shift();
    await stack.save();

    res.json({ success: true, message: 'Task deleted' });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete task', error: err.message });
  }
});

// ============================================
//  TOGGLE FAVOURITE TASK
// DESCRIPTION: Toggles the `isFavorite` status of a task in both MongoDB and the C++ system.
// SUCCESS RESPONSE:
//     // res.json({
//     //   success: true,
//     //   message: task.isFavorite ? 'Added to favorites' : 'Removed from favorites',
//     //   data: task // The updated task object
// // });
//     // PATH:  PATCH /api/tasks/:id/favorite
// ============================================
router.patch('/:id/favorite', async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.id, userId: req.userId });
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.isFavorite = !task.isFavorite;
    await task.save();

    // Update in C++
    await cppBridge.updateTask(req.params.id, { isFavorite: task.isFavorite });

    res.json({
      success: true,
      message: task.isFavorite ? 'Added to favorites' : 'Removed from favorites',
      data: task
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});



module.exports = router;