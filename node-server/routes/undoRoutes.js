const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const cppBridge = require('../utils/cppBridge');
const Task = require('../models/Task');
const Stack = require('../models/Stack');

const router = express.Router();
router.use(verifyToken);

// Helper: Get or create user's stack
async function getUserStack(userId) {
  let stack = await Stack.findOne({ userId });
  if (!stack) {
    stack = new Stack({ userId, stack: [] });
    await stack.save();
  }
  return stack;
}

// Helper: Push operation to MongoDB stack
async function pushToStack(userId, operation) {
  const stack = await getUserStack(userId);
  
  stack.stack.push(operation);
  if (stack.stack.length > 20) {
    stack.stack.shift();
  }
  
  await stack.save();
}

// ============================================
//  Annuler la dernière opération
// Description : Annule la dernière opération effectuée par l'utilisateur (CREATE, UPDATE ou DELETE) en utilisant le principe LIFO
// Reponse succés en json format:
// { 
//    "success": true,
//    "message": "Operation undone successfully",
//    "operationType": "(CREATE, UPDATE ou DELETE)" 
// }
// Route:  POST /api/undo/undo
// ============================================
router.post('/undo', async (req, res) => {
  try {
    const stack = await getUserStack(req.userId);
    if (!stack.stack || stack.stack.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to undo' });
    }

    const operation = stack.stack.pop();
    await stack.save();

    if (operation.type === 'CREATE') {

      await Task.deleteOne({ taskId: operation.taskId, userId: req.userId });
      await cppBridge.deleteTask(operation.taskId);

    } else if (operation.type === 'UPDATE') {

      const prev = operation.previousState;
      await Task.findOneAndUpdate({ taskId: operation.taskId, userId: req.userId }, prev, { new: true });
      await cppBridge.updateTask(operation.taskId, prev);

    } else if (operation.type === 'DELETE') {

      const prev = operation.previousState;
      await Task.deleteOne({ taskId: prev.taskId, userId: req.userId });
      const restoredTask = new Task({ ...prev, userId: req.userId });
      await restoredTask.save();
      await cppBridge.createTask({ ...prev, userId: req.userId });
    }

    res.json({ success: true, message: 'Undo successful', operationType: operation.type });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to undo', error: err.message });
  }
});

// ============================================
// Obtenir le statut de l'annulation
// Description: Renvoie des informations sur la disponibilité de l'annulation. 
//              Vérifie si la pile MongoDB contient des opérations et interroge également la disponibilité de l'annulation dans la structure C++.
// Reponse succés en json format:
// {
//   "success": true,
//   "canUndo": true, 
//   "undoCount": 5, 
//   "cppHasUndo": true
// }
// Route:  GET /api/undo/status
// ============================================
router.get('/status', async (req, res) => {
  try {
    // Check both C++ and MongoDB
    const cppResult = await cppBridge.getUndoStatus(req.userId);
    const stack = await getUserStack(req.userId);

    res.json({
      success: true,
      canUndo: stack.stack.length > 0,
      undoCount: stack.stack.length,
      cppHasUndo: cppResult.hasUndo
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// Obtenir l'historique d'annulation
// Description: Retrieves a chronological list of all undoable operations stored in the user's undo stack.
// Reponse succés en json format:
// {
//   "success": true,
//    "count": 8,
//    "history":[
//       {
//        "type": "CREATE",
//        "taskId": "44fcbe9ac84d190f",
//        "taskTitle": "Example Task",
//        "timestamp": "2025-12-07T20:55:48.033Z"
//       }
//    ]
// }
// Route:  GET /api/undo/history
// ============================================
router.get('/history', async (req, res) => {
  try {
    const stack = await getUserStack(req.userId);

    const history = stack.stack.map(op => ({
      type: op.type,
      taskId: op.taskId,
      taskTitle: op.newState?.title || op.previousState?.title,
      taskDesc: op.newState?.description || op.previousState?.description,
      taskStatus: op.newState?.status || op.previousState?.status,
      taskPriority: op.newState?.priority || op.previousState?.priority,
      taskTags: op.newState?.tags || op.previousState?.tags,
      timestamp: op.timestamp
    })).reverse();

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================
// Vider l'historique d'annulation
// Description: Supprime toutes les opérations enregistrées dans la pile d'annulation de l'utilisateur dans MongoDB.
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Undo history cleared"
// }
// Route:  DELETE /api/undo/clear
// ============================================
router.delete('/clear', async (req, res) => {
  try {
    await Stack.findOneAndUpdate(
      { userId: req.userId },
      { stack: [] }
    );

    res.json({
      success: true,
      message: 'Undo history cleared'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;