
const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  tasks: [{
    taskId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    position: {
      type: Number
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


// Update positions before saving
QueueSchema.pre('save', function(next) {
  this.tasks.forEach((task, index) => {
    task.position = index + 1;
  });
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Queue', QueueSchema);