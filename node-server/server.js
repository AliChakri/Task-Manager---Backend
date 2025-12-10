const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- Gestionnaires de Routes ---
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const Undorouter = require('./routes/undoRoutes');
const queueRoute = require('./routes/queueRoutes');

// --- Utilitaires & Modèles ---

// Utilitaire pour interagir avec le système externe de gestion des tâches en C++
const cppBridge = require('./utils/cppBridge');

const Task = require('./models/Task');
const Queue = require('./models/Queue');

const app = express();

const PORT = process.env.PORT || 5000;

// --- Middleware d'Application ---

app.use(
    cors({
        origin: process.env.FRONTEND_URI,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);

app.use(express.json());

// --- Connexion à la Base de Données MongoDB ---

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connecté avec succès')
    })
    .catch(err => console.error('Erreur de connexion à MongoDB :', err));

// --- Middleware Personnalisé ---

// Enregistre la méthode HTTP et le chemin pour chaque requête entrante
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// --- Définitions des Routes API ---

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/undo', Undorouter);
app.use('/api/queue', queueRoute);

// --- Gestionnaires d'Erreurs ---

// Gestionnaire 404 : Exécuté si aucune autre route ne correspond à la requête entrante
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// --- Initialisation et Arrêt du Serveur ---

app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});

// Mécanisme d'arrêt élégant : Gère le signal SIGTERM (généralement envoyé par les orchestrateurs de conteneurs comme Docker/Kubernetes)
process.on('SIGTERM', () => {
    console.log('SIGTERM reçu, fermeture du serveur...');
    // Assurer que la connexion au pont C++ est correctement terminée
    const cppBridge = require('./utils/cppBridge');
    cppBridge.close();
    // Fermer la connexion à la base de données MongoDB
    mongoose.connection.close();
    process.exit(0);
});

// --- Synchronisation des Données au Démarrage ---

/**
 * Charge les files d'attente persistantes depuis MongoDB et synchronise leur état avec le système de gestion des tâches en C++.
 * Ceci garantit que la file d'attente du système C++ (basée sur la mémoire) démarre avec les données les plus récentes.
 */
(async function loadQueue() {
  try {
      
        const allQueues = await Queue.find({});

        for (const queue of allQueues) {
            for (const task of queue.tasks) {
                // Appeler le pont C++ pour ajouter la tâche à la structure de file d'attente C++
                await cppBridge.addToQueue(task.taskId);
            }
        }

        console.log('Files d\'attente de traitement synchronisées avec C++');
    } catch (err) {
        console.error('Échec de la synchronisation des files d\'attente :', err);
    }
})();

module.exports = app;