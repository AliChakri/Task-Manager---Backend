const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const cppBridge = require('../utils/cppBridge');
const Task = require('../models/Task');
const Queue = require('../models/Queue');

const queueRoute = express.Router();
queueRoute.use(verifyToken);

async function getUserQueue(userId) {
  let queue = await Queue.findOne({ userId });
  if (!queue) {
    queue = new Queue({ userId, tasks: [] });
    await queue.save();
  }
  return queue;
}

// ============================================
// Ajouter une tâche à la file de traitement
// Description: Ajoute une tâche à la file d'attente de traitement de l'utilisateur si son statut est TO_DO (0) ou PENDING (1). 
//              La tâche est également ajoutée à la structure de file d'attente C++ sous-jacente.
// Reponse succés en json format:
// {	
// "success": true,	
// "message": "Task added to processing queue",	
// "queueSize": 1,	
// "position": 1	
// }
// Route:  POST /api/queue/add/:taskId
// ============================================
queueRoute.post('/add/:taskId', async (req, res) => {
  try {
    const stringTaskId = req.params.taskId;

    const task = await Task.findOne({ taskId: stringTaskId, userId: req.userId });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only TO_DO (0) or PENDING (1)
    if (![0, 1].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only TO_DO or PENDING tasks can be added to queue'
      });
    }

    const queue = await getUserQueue(req.userId);

    const alreadyQueued = queue.tasks.some(t => t.taskId.toString() === task._id.toString());

    if (alreadyQueued) {
      return res.status(400).json({
        success: false,
        message: 'Task is already in the queue'
      });
    }

    queue.tasks.push({
      taskId: task._id,
      addedAt: new Date()
    });

    await queue.save();

    // Send task._id to C++
    await cppBridge.addToQueue(task._id.toString());

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
// Traiter la prochaine tâche (Defiller)
// Description: Retire la première tâche de la file de l'utilisateur (FIFO) . 
//              La tâche est ensuite marquée comme `IN_PROGRESS` (2) dans la base de données.
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Started working on task",
//   "task": nouvTask (apres l'echange de status ),
//   "remainingInQueue": Int 
// }
// Route:  POST /api/queue/next
// ============================================
queueRoute.post('/next', async (req, res) => {
  try {
    const queue = await getUserQueue(req.userId);

    if (queue.tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Processing queue is empty'
      });
    }

    const queuedTask = queue.tasks.shift();
    await queue.save();

    // Process in C++ queue
    const cppResult = await cppBridge.processNextTask(req.userId);

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
// Voir la file de traitement
// Description: Renvoie une liste complète des tâches actuellement en attente dans la file de l'utilisateur, 
//              y compris leurs métadonnées (position, date d'ajout) et les détails de la tâche.
// Reponse succés en json format:
// {
//   "success": true,
//   "queueSize": 1,
//   "isEmpty": false,
//   "queue": [
//     {
//       "position": 1,
//       "taskId": "44fcbe9ac84d190f",
//       "addedAt": "2025-12-07T21:24:41.701Z",
//       "task": { /* task details... */ }
//     }
//   ]
// }
// Route:  GET /api/queue
// ============================================
queueRoute.get('/', async (req, res) => {
  try {
    const queue = await getUserQueue(req.userId);

    const taskIds = queue.tasks.map(t => t.taskId);
    const tasks = await Task.find({ taskId: { $in: taskIds } });

    const queueWithDetails = queue.tasks.map((queueItem, index) => {
      const task = tasks.find(t => t.taskId === queueItem.taskId);
      return {
        position: index + 1,
        taskId: queueItem.taskId,
        addedAt: queueItem.addedAt,
        task: task ? {
          title: task.title,
          Description: task.Description,
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
// Vider toute la file
// Description: Supprime toutes les tâches de la file de l'utilisateur.
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Cleared 2 tasks from queue"
// }
// Route:  DELETE /api/queue/clear
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
// Obtenir le statut de la file
// Description: Renvoie des informations agrégées sur l'état de la file d'attente de l'utilisateur,
//              y compris la taille de la file MongoDB et la taille de la file C++ sous-jacente,
//              pour des raisons de surveillance et de cohérence
// Reponse succés en json format:
// {
// "success": true,
//   "queueSize": 1,
//   "isEmpty": false,
//   "hasNext": true,
//   "nextTask": "44fcbe9ac84d190f",
//   "cppQueueSize": 0 
// }
// Route:  GET /api/queue/status
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
// Aperçu de la prochaine tâche (sans retrait)
// Description: Renvoie les détails de la prochaine tâche à être traitée (la première de la file) sans la retirer de la file d'attente.
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Next task in queue",
//   "task": { /* full task object of the next task */ },
//   "position": 1,
//   "remainingInQueue": 1 
// }
// Route:  GET /api/queue/peek
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