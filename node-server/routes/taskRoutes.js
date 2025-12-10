const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const cppBridge = require('../utils/cppBridge');
const Task = require('../models/Task');
const Stack = require('../models/Stack');
const moment = require('moment');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

// Middleware to ensure all routes in this file are protected
// All task operations require a valid user token.
router.use(verifyToken);

// ============================================
//  Créer une Tâche
// Description: Gère la création d'une nouvelle tâche.
// Implémentation C++ : Appel à cppBridge.createTask(taskData) pour insérer la nouvelle tâche dans la structure de données C++
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Task created successfully",
//   "data": { /* Nouvou Tache objet */ }
// }
// Route:  POST /api/tasks
// ============================================
router.post('/', async (req, res) => {
  try {
    const { title, Description, priority, status, tags, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const taskId = crypto.randomBytes(8).toString('hex');

    const taskData = {
      taskId,
      title: title.trim(),
      Description: Description || '',
      priority: priority || 1,
      tags: tags || [],
      status: status || 0,
      userId: req.userId,
      dueDate: dueDate || null
    };

    // Create task in C++
    const cppResult = await cppBridge.createTask(taskData);
    if (!cppResult.success) return res.status(400).json(cppResult);

    const dbTask = new Task(taskData);
    await dbTask.save();

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
//  Obtenir Toutes les Tâches
// Description: Récupère toutes les tâches appartenant à l'utilisateur authentifié, 
// triées par date de création (du plus récent au plus ancien).
// Reponse succés en json format:
// {
//   success: true,
//   count: tasks.length,
//   data: tasks // Tableau de toutres les Taches Objet
// }
// Route:  GET /api/tasks
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
//   Obtenir les Statistiques Générales
// Description: Fournit des statistiques de haut niveau, incluant le nombre total de tâches pour tous les utilisateurs, 
// le nombre total d'utilisateurs vérifiés, le nombre de tâches complétées par l'utilisateur actuel, 
// et le nombre de tâches créées ce mois-ci par l'utilisateur.
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Task statistics fetched successfully",
//   "data": {
//     "totalTasks": 1500,
//     "totalUsers": 50,
//     "completedTasks": 15,
//     "tasksThisMonth": 7 
//   }
// Route:  GET /api/tasks/stats
// ============================================
router.get('/stats' ,async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user ID found'
      });
    }

    const totalTasks = await Task.countDocuments();
    
    const totalUsers = await User.countDocuments({ isVerified: true });

    const completedTasks = await Task.countDocuments({
      userId,
      status: 3 // COMPLETED
    });

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
        totalUsers,
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
//  Obtenir les Tâches Favorites
// Description: Récupère toutes les tâches appartenant à l'utilisateur authentifié qui ont été marquées comme favorites (isFavorite: true).
// Reponse succés en json format:
// {
//   "success": true,
//   "count": 5,
//   "data":
// }
// Route:  GET /api/tasks/favorites
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
//  Obtenir les Statistiques de Statut (Graphique en Secteur)
// Description: Calcule le décompte des tâches pour chaque statut (`To Do`, `Pending`, `In Progress`, `Completed`), idéal pour un graphique en secteur .
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Task status stats fetched successfully",
//   "data": {
//     "todo": 5, 
//     "pending": 2, 
//     "inProgress": 1, 
//     "completed": 4
//   }
// }
// Route:  GET /api/tasks/status-stats
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
//   Obtenir les Statistiques Hebdomadaires (Graphique Linéaire)
// Description: Agrège le nombre de tâches complétées (status: 3) par jour pour la semaine en cours (du lundi au dimanche), souvent utilisé pour un graphique linéaire .
// Reponse succés en json format:
// {
//   "success": true,
//     "data": [
//       { "day": "Mon", "completed": 2 },
//       { "day": "Tue", "completed": 0 },
//     { "day": "Wed", "completed": 5 }, // ... 
//   ]
// }
// Route:  GET /api/tasks/week-stats
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
// Rechercher des Tâches par Titre
// Description: Permet aux utilisateurs de rechercher leurs tâches par titre en utilisant une expression régulière insensible à la casse (`$regex`, `$options: 'i'`).
// Reponse succés en json format:
// {
//   "success": true,
//   "count": 3, 
//   "data": [ /* Tableau de Tache objets */ ]
// }
// Route:  GET /api/tasks/search?title=yourSearchTerm
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
// Effacer Toutes les Tâches
// Description: Supprime toutes les tâches appartenant à l'utilisateur connecté.
// Reponse succés en json format:
// {
//   "success": true,
//   "deletedCount": 15,
//   "message": "All tasks cleared successfully"
// }
// Route:  POST /api/tasks/clear
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
// Lire une Tâche Individuelle
// Description: Récupère les détails d'une seule tâche par son `taskId`.
// Reponse succés en json format:
// {
//   "success": true,
//   "data": { /* task object */ }
// }
// Route:  GET /api/tasks/:id
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
//  Mettre à jour une Tâche
// Description: Modifie les détails d'une tâche existante (`taskId` dans les paramètres).
//   **Implémentation C++** : Appel à `cppBridge.updateTask(taskId, updateData)` pour synchroniser les modifications avec la structure C++.
//    Enregistrement de l'action `UPDATE` (avec `previousState` et `newState`) dans la Pile d'Annulation.
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Task updated successfully",
//   "data": { /* updated task object */ }
// }
//   // Route:  PUT /api/tasks/:id
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;

    const oldTask = await Task.findOne({ taskId, userId: req.userId });
    if (!oldTask) return res.status(404).json({ success: false, message: 'Task not found' });

    // Update in Mongo
    const task = await Task.findOneAndUpdate(
      { taskId, userId: req.userId },
      updateData,
      { new: true }
    );

    // Update in C++
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
//   Supprimer une Tâche
// Description: Supprime une tâche de manière permanente.
// Implémentation C++ : Appel à cppBridge.deleteTask(taskId) pour retirer la tâche de la structure C++.
// Reponse succés en json format:
// { 
//    "success": true,
//    "message": "Task deleted successfully" 
// }
//     // Route:  DELETE /api/tasks/:id
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
//  Basculer le Statut Favori
// Description: Inverse le statut isFavorite d'une tâche.
// Implémentation C++ : Appel à cppBridge.updateTask(taskId, { isFavorite: value }) pour synchroniser le statut.
// Reponse succés en json format:
// {
//   "success": true,
//   "message": "Added to favorites",
//   "data": Taches
// }
//     // Route:  PATCH /api/tasks/:id/favorite
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