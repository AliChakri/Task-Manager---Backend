#ifndef TASKCONTROLLER_H
#define TASKCONTROLLER_H

#include "../models/Task.h"
#include "../models/LinkedList.h"
#include "../models/Operation.h"
#include "../datastructures/Stack.h"
#include "../datastructures/Queue.h"
#include <string>

class TaskController {
private:
    TaskLinkedList taskList;
    Stack undoStack;
    Queue<std::string> processingQueue;
    int nextId;
    const int MAX_UNDO_SIZE = 20;

    void pushUndo(const Operation& op);

public:
    TaskController() : nextId(1) {}

    // Core CRUD Operations
    std::string createTask(const std::string& jsonData);
    std::string getTasks(const std::string& userId);
    std::string getTask(const std::string& taskId);
    std::string editTask(const std::string& taskId, const std::string& jsonData);
    std::string deleteTask(const std::string& taskId);

    // Undo
    std::string undoLastOperation(const std::string& userId);
    std::string getUndoStatus(const std::string& userId);
    std::string getUndoHistory(const std::string& userId);

    // Processing Queue
    std::string addToQueue(const std::string& taskId);
    std::string processNextTask(const std::string& userId);
    std::string viewQueue(const std::string& userId);
    std::string removeFromQueue(const std::string& taskId);
    std::string getQueueStatus(const std::string& userId);

    // Command router
    std::string handleRequest(const std::string& jsonRequest);
};

#endif
