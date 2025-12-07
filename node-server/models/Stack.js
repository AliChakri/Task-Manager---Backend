
const mongoose = require('mongoose');

const OperationSchema = new mongoose.Schema({
  type: { 
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    required: true
  },
  taskId: { 
    type: String,
    required: true
  },
  previousState: { 
    type: mongoose.Schema.Types.Mixed
   },
  newState: { 
    type: mongoose.Schema.Types.Mixed
   },
  timestamp: { 
    type: Date, default: Date.now
  }
});

const StackSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stack: { 
    type: [OperationSchema],
    default: []
  }
});

module.exports = mongoose.model('Stack', StackSchema);
