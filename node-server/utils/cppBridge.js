const { spawn } = require('child_process');
const path = require('path');

class CppBridge {
  constructor() {
    this.cppProcess = null;
    this.initProcess();
  }

  initProcess() {
    const cppExecutable = path.join(__dirname, '../../cpp-backend/task_manager');
    this.cppProcess = spawn(cppExecutable);

    this.cppProcess.stderr.on('data', (data) => {
      console.error(`C++ Error: ${data}`);
    });

    this.cppProcess.on('close', (code) => {
      console.log(`C++ process exited with code ${code}`);
      if (code !== 0) {
        setTimeout(() => this.initProcess(), 1000);
      }
    });
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      const jsonCommand = JSON.stringify(command) + '\n';

      const timeout = setTimeout(() => {
        reject(new Error('C++ process timeout'));
      }, 5000);

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

      this.cppProcess.stdout.once('data', onData);
      this.cppProcess.stdin.write(jsonCommand);
    });
  }

  async initNextId(nextId) {
    return this.sendCommand({
      action: 'initNextId',
      nextId
    });
  }

  // --- Task OPERATIONS ---
  
  async createTask(taskData) {
    return this.sendCommand({
      action: 'create',
      data: {
        ...taskData,
        userId: String(taskData.userId)
      }
    });
  }

  async getTasks(userId) {
    return this.sendCommand({
      action: 'getAll',
      userId: String(userId)
    });
  }

  async getTaskById(taskId) {
    return this.sendCommand({
      action: 'getById',
      taskId: String(taskId)
    });
  }

  async updateTask(taskId, updateData) {
    return this.sendCommand({
      action: 'update',
      taskId: String(taskId),
      data: updateData
    });
  }

  async deleteTask(taskId) {
    return this.sendCommand({
      action: 'delete',
      taskId: String(taskId)
    });
  }

  // --- STACK (Undo) OPERATIONS ---
  async undoLastOperation(userId) {
    return this.sendCommand({
      action: 'undo',
      userId: String(userId)
    });
  }

  async getUndoStatus(userId) {
    return this.sendCommand({
      action: 'undoStatus',
      userId: String(userId)
    });
  }

  async getUndoHistory(userId) {
    return this.sendCommand({
      action: 'undoHistory',
      userId: String(userId)
    });
  }

  // Processing Queue Operations
  
  async addToQueue(taskId) {
    return this.sendCommand({
      action: 'addToQueue',
      taskId: String(taskId)
    });
  }

  async processNextTask(userId) {
    return this.sendCommand({
      action: 'processNext',
      userId: String(userId)
    });
  }

  async viewQueue(userId) {
    return this.sendCommand({
      action: 'viewQueue',
      userId: String(userId)
    });
  }

  async getQueueStatus(userId) {
    return this.sendCommand({
      action: 'queueStatus',
      userId: String(userId)
    });
  }

  close() {
    if (this.cppProcess) {
      this.cppProcess.kill();
    }
  }
}

module.exports = new CppBridge();
