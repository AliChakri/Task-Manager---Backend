
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  priority: {
    type: Number,
    enum: [1, 2, 3], // LOW, MEDIUM, HIGH
    default: 2
  },
    status: {
    type: Number,
    enum: [0, 1, 2, 3], // TO_DO, PENDING, IN_PROGRESS, COMPLETED
    default: 0
    },
    tags: [{
            type: String,
            trim: true
    }],
    isFavorite: {
            type: Boolean,
            default: false
    },
  dueDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', taskSchema);