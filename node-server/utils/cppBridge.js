const { spawn } = require('child_process');
const path = require('path');

// CppBridge : Classe de passerelle entre Node.js et le processus C++
// Cette classe gère le processus enfant C++ et toute la communication bidirectionnelle
// via les flux standard (stdin et stdout).
class CppBridge {
  // Constructeur : initialise le processus C++ au moment de l'instanciation
  constructor() {
    this.cppProcess = null;
    this.initProcess();
  }

  initProcess() {
    const cppExecutable = path.join(__dirname, '../../cpp-backend/task_manager');

    // Démarre le processus C++ en tant que processus enfant Node.js 
    this.cppProcess = spawn(cppExecutable);

    // Gère les erreurs envoyées par le flux d'erreur standard (stderr) du processus C++
    this.cppProcess.stderr.on('data', (data) => {
      console.error(`C++ Error: ${data}`);
    });

    // Gère la fermeture du processus C++
    this.cppProcess.on('close', (code) => {
      console.log(`C++ process exited with code ${code}`);

      if (code !== 0) {
        setTimeout(() => this.initProcess(), 1000);
      }
    });
  }

  // Méthode générique asynchrone pour envoyer des commandes au processus C++
  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      // Convertit l'objet de commande en chaîne JSON et ajoute un saut de ligne ('\n')
      // nécessaire pour que le processus C++ puisse lire la commande en une seule ligne.
      const jsonCommand = JSON.stringify(command) + '\n';

      // Définit un délai d'attente (timeout) pour éviter que l'application ne se bloque si le processus C++ ne répond pas
      const timeout = setTimeout(() => {
        reject(new Error('C++ process timeout'));
      }, 5000);

      // Gestionnaire de données reçues sur le flux de sortie standard (stdout) du processus C++
      const onData = (data) => {
        clearTimeout(timeout);
        this.cppProcess.stdout.removeListener('data', onData);

        try {
          const str = data.toString().trim();
          const response = JSON.parse(str);
          resolve(response);
        } catch (err) {
          reject(new Error('Invalid JSON from C++: ' + data.toString()));
        }
      };

      // Écoute la prochaine donnée sur stdout (la réponse à notre commande)
      this.cppProcess.stdout.once('data', onData);
      // Envoie la commande JSON au flux d'entrée standard (stdin) du processus C++
      this.cppProcess.stdin.write(jsonCommand);
    });
  }

  // Initialisation du prochain identifiant disponible (s'il est géré par le C++)
  async initNextId(nextId) {
    return this.sendCommand({
      action: 'initNextId',
      nextId
    });
  }

  // --- OPÉRATIONS DE TÂCHE ---
  
  // Envoie une commande de création de tâche au C++
  async createTask(taskData) {
    return this.sendCommand({
      action: 'create',
      data: {
        ...taskData,
        userId: String(taskData.userId)
      }
    });
  }

  // Envoie une commande pour récupérer toutes les tâches d'un utilisateur
  async getTasks(userId) {
    return this.sendCommand({
      action: 'getAll',
      userId: String(userId)
    });
  }

  // Envoie une commande pour récupérer une tâche par son ID
  async getTaskById(taskId) {
    return this.sendCommand({
      action: 'getById',
      taskId: String(taskId)
    });
  }

  // Envoie une commande pour mettre à jour une tâche
  async updateTask(taskId, updateData) {
    return this.sendCommand({
      action: 'update',
      taskId: String(taskId),
      data: updateData
    });
  }

  // Envoie une commande pour supprimer une tâche
  async deleteTask(taskId) {
    return this.sendCommand({
      action: 'delete',
      taskId: String(taskId)
    });
  }

  // --- OPÉRATIONS DE PILE (ANNULATION - Undo) ---
  
  // Envoie une commande pour annuler la dernière opération
  async undoLastOperation(userId) {
    return this.sendCommand({
      action: 'undo',
      userId: String(userId)
    });
  }

  // Envoie une commande pour obtenir le statut d'annulation (peut-on annuler ?)
  async getUndoStatus(userId) {
    return this.sendCommand({
      action: 'undoStatus',
      userId: String(userId)
    });
  }

  // Envoie une commande pour obtenir l'historique d'annulation
  async getUndoHistory(userId) {
    return this.sendCommand({
      action: 'undoHistory',
      userId: String(userId)
    });
  }

  // --- OPÉRATIONS DE FILE D'ATTENTE DE TRAITEMENT ---
  
  // Envoie une commande pour ajouter une tâche à la file d'attente C++
  async addToQueue(taskId) {
    return this.sendCommand({
      action: 'addToQueue',
      taskId: String(taskId)
    });
  }

  // Envoie une commande pour traiter la prochaine tâche dans la file (défilement)
  async processNextTask(userId) {
    return this.sendCommand({
      action: 'processNext',
      userId: String(userId)
    });
  }

  // Envoie une commande pour visualiser la file d'attente C++
  async viewQueue(userId) {
    return this.sendCommand({
      action: 'viewQueue',
      userId: String(userId)
    });
  }

  // Envoie une commande pour obtenir le statut actuel de la file d'attente C++
  async getQueueStatus(userId) {
    return this.sendCommand({
      action: 'queueStatus',
      userId: String(userId)
    });
  }

  // Arrête proprement le processus enfant C++
  close() {
    if (this.cppProcess) {
      this.cppProcess.kill();
    }
  }
}

// Exporte une instance unique (Singleton) de la classe CppBridge
module.exports = new CppBridge();