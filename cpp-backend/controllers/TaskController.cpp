#include "TaskController.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <limits>

using json = nlohmann::json;

// ---------------------------------------------------------
// PRIVATE: pushUndo()
// ---------------------------------------------------------
void TaskController::pushUndo(const Operation& op) {
    // enforce max undo size (here simple 1-level undo)
    if (!undoStack.isEmpty()) {
        undoStack.pop();  // remove previous (keep only 1-level)
    }
    undoStack.push(op);
}


// ============================================
// CREATE TASK
// ============================================
std::string TaskController::createTask(const std::string& jsonData) {
    try {
        json input = json::parse(jsonData);

        std::string taskId = input["taskId"].get<std::string>();
        std::string userId = input["userId"].get<std::string>();
        int priorityValue = input.value("priority", 2);

        Task* newTask = new Task(
            taskId,
            input["title"].get<std::string>(),
            input.value("description", ""),
            static_cast<Priority>(priorityValue),
            userId
        );

        if (input.contains("dueDate") && !input["dueDate"].is_null()) {
            newTask->setDueDate(input["dueDate"].get<time_t>());
        }

        taskList.insert(newTask);

        // Push undo operation: undo of create = delete
        // Operation op(OperationType::DELETE_OP, taskId, "", newTask->toJson(), userId);
        // pushUndo(op);

        // Operation op(OperationType::CREATE, taskId, "", newTask->toJson(), userId);
        // pushUndo(op);

        json response;
        response["success"] = true;
        response["message"] = "Task created successfully";
        response["data"] = json::parse(newTask->toJson());

        return response.dump();

    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Create task error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// GET ALL TASKS FOR USER
// ============================================
std::string TaskController::getTasks(const std::string& userId) {
    try {
        std::vector<Task*> tasks = taskList.getByUserId(userId);

        json response;
        response["success"] = true;
        response["count"] = tasks.size();
        response["data"] = json::array();

        for (Task* task : tasks) {
            response["data"].push_back(json::parse(task->toJson()));
        }

        return response.dump();

    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Get tasks error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// GET SINGLE TASK BY ID
// ============================================
std::string TaskController::getTask(const std::string& taskId) {
    try {
        Task* task = taskList.find(taskId);

        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

        json response;
        response["success"] = true;
        response["data"] = json::parse(task->toJson());

        return response.dump();

    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Get task error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// UPDATE TASK
// ============================================
std::string TaskController::editTask(const std::string& taskId, const std::string& jsonData) {
    try {
        Task* task = taskList.find(taskId);
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

        // Save previous state for undo
        std::string prevState = task->toJson();

        json input = json::parse(jsonData);

        if (input.contains("title") && !input["title"].is_null())
            task->setTitle(input["title"].get<std::string>());
        if (input.contains("description") && !input["description"].is_null())
            task->setDescription(input["description"].get<std::string>());
        if (input.contains("priority") && !input["priority"].is_null())
            task->setPriority(static_cast<Priority>(input["priority"].get<int>()));
        if (input.contains("status") && !input["status"].is_null())
            task->setStatus(static_cast<Status>(input["status"].get<int>()));
        if (input.contains("isFavorite") && !input["isFavorite"].is_null())
            task->setIsFavorite(input["isFavorite"].get<bool>());
        if (input.contains("tags") && input["tags"].is_array()) {
            std::vector<std::string> newTags;
            for (const auto& tag : input["tags"])
                newTags.push_back(tag.get<std::string>());
            task->setTags(newTags);
        }
        if (input.contains("dueDate") && !input["dueDate"].is_null())
            task->setDueDate(input["dueDate"].get<time_t>());

        // Push undo operation: undo of update = restore previous state
        // Operation op(OperationType::UPDATE, taskId, prevState, task->toJson(), task->getUserId());
        // pushUndo(op);

        json response;
        response["success"] = true;
        response["message"] = "Task updated successfully";
        response["data"] = json::parse(task->toJson());

        return response.dump();

    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Edit task error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// DELETE TASK
// ============================================
std::string TaskController::deleteTask(const std::string& taskId) {
    try {
        Task* task = taskList.find(taskId);
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

        // Push undo operation: undo of delete = restore deleted task
        // Operation op(OperationType::CREATE, taskId, task->toJson(), "", task->getUserId());
        // Operation op(OperationType::DELETE_OP, taskId, task->toJson(), "", task->getUserId());
        // pushUndo(op);

        bool removed = taskList.remove(taskId);

        json response;
        response["success"] = removed;
        response["message"] = removed ? "Task deleted successfully" : "Failed to delete task";

        return response.dump();

    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Delete task error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// UNDO LAST OPERATION (1-level simple undo)
// ============================================
std::string TaskController::undoLastOperation(const std::string& userId) {
    try {
        if (undoStack.isEmpty()) {
            json error;
            error["success"] = false;
            error["error"] = "Nothing to undo";
            return error.dump();
        }

        Operation op = undoStack.pop();
        Task* task;

        switch (op.type) {
            case CREATE: // undo = delete created task
                taskList.remove(op.taskId);
                break;

            case DELETE_OP: { // undo = restore deleted task
                // Recreate task from JSON string
                json j = json::parse(op.newState);
                task = new Task(
                    j["id"].get<std::string>(),
                    j["title"].get<std::string>(),
                    j["description"].get<std::string>(),
                    static_cast<Priority>(j["priority"].get<int>()),
                    j["userId"].get<std::string>()
                );
                if (!j["dueDate"].is_null()) task->setDueDate(j["dueDate"].get<time_t>());
                if (!j["status"].is_null()) task->setStatus(static_cast<Status>(j["status"].get<int>()));
                if (!j["isFavorite"].is_null()) task->setIsFavorite(j["isFavorite"].get<bool>());
                if (j.contains("tags") && j["tags"].is_array()) {
                    std::vector<std::string> tags;
                    for (auto& t : j["tags"]) tags.push_back(t.get<std::string>());
                    task->setTags(tags);
                }
                taskList.insert(task);
                break;
            }

            case UPDATE: { // undo = restore previous state
                json j = json::parse(op.previousState);
                // remove old version
                taskList.remove(op.taskId);
                // recreate previous version
                task = new Task(
                    j["id"].get<std::string>(),
                    j["title"].get<std::string>(),
                    j["description"].get<std::string>(),
                    static_cast<Priority>(j["priority"].get<int>()),
                    j["userId"].get<std::string>()
                );
                if (!j["dueDate"].is_null()) task->setDueDate(j["dueDate"].get<time_t>());
                if (!j["status"].is_null()) task->setStatus(static_cast<Status>(j["status"].get<int>()));
                if (!j["isFavorite"].is_null()) task->setIsFavorite(j["isFavorite"].get<bool>());
                if (j.contains("tags") && j["tags"].is_array()) {
                    std::vector<std::string> tags;
                    for (auto& t : j["tags"]) tags.push_back(t.get<std::string>());
                    task->setTags(tags);
                }
                taskList.insert(task);
                break;
            }
        }

        json response;
        response["success"] = true;
        response["message"] = "Undo successful";
        return response.dump();

    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Undo error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// GET UNDO STATUS
// ============================================
std::string TaskController::getUndoStatus(const std::string& userId) {
    json response;
    response["success"] = true;
    response["hasUndo"] = !undoStack.isEmpty();
    return response.dump();
}

// ============================================
// GET UNDO HISTORY (just last op for 1-level)
// ============================================
std::string TaskController::getUndoHistory(const std::string& userId) {

    json response;
    response["success"] = true;
    if (!undoStack.isEmpty()) {
        response["lastOperation"] = json::parse(undoStack.peek().toJson());
    } else {
        response["lastOperation"] = nullptr;
    }
    return response.dump();
}

// QUEUE METHODS

// ============================================
// ADD TASK TO PROCESSING QUEUE
// ============================================
std::string TaskController::addToQueue(const std::string& taskId) {
    try {
        Task* task = taskList.find(taskId);
        
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

        // Only allow TO_DO or PENDING tasks to be queued
        if (task->getStatus() != TO_DO && task->getStatus() != PENDING) {
            json error;
            error["success"] = false;
            error["error"] = "Only TO_DO or PENDING tasks can be added to queue";
            return error.dump();
        }

        // Check if already in queue (simple check - would need list iteration in production)
        processingQueue.enqueue(taskId);
        
        json response;
        response["success"] = true;
        response["message"] = "Task added to processing queue";
        response["queueSize"] = processingQueue.getSize();
        
        return response.dump();
        
    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Add to queue error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// PROCESS NEXT TASK (Dequeue)
// ============================================
std::string TaskController::processNextTask(const std::string& userId) {
    try {
        if (processingQueue.isEmpty()) {
            json error;
            error["success"] = false;
            error["error"] = "Processing queue is empty";
            return error.dump();
        }

        // Dequeue next task
        std::string taskId = processingQueue.dequeue();
        Task* task = taskList.find(taskId);
        
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

        // Check if task belongs to this user
        if (task->getUserId() != userId) {
            json error;
            error["success"] = false;
            error["error"] = "Task does not belong to this user";
            return error.dump();
        }

        // Change status to IN_PROGRESS
        task->setStatus(IN_PROGRESS);
        
        json response;
        response["success"] = true;
        response["message"] = "Started working on task";
        response["task"] = json::parse(task->toJson());
        response["remainingInQueue"] = processingQueue.getSize();
        
        return response.dump();
        
    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Process next error: ") + e.what();
        return error.dump();
    }
}

// ============================================
// VIEW PROCESSING QUEUE
// ============================================
std::string TaskController::viewQueue(const std::string& userId) {
    try {
        json response;
        response["success"] = true;
        response["queueSize"] = processingQueue.getSize();
        response["isEmpty"] = processingQueue.isEmpty();
        
        // Note: To actually list tasks, we'd need to iterate the queue
        // For now, just return the size
        
        return response.dump();
        
    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = e.what();
        return error.dump();
    }
}

// ============================================
// GET QUEUE STATUS
// ============================================
std::string TaskController::getQueueStatus(const std::string& userId) {
    try {
        json response;
        response["success"] = true;
        response["queueSize"] = processingQueue.getSize();
        response["isEmpty"] = processingQueue.isEmpty();
        response["hasNext"] = !processingQueue.isEmpty();
        
        return response.dump();
        
    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = e.what();
        return error.dump();
    }
}

// ============================================
// HANDLE REQUEST (Main entry point)
// ============================================
std::string TaskController::handleRequest(const std::string& jsonRequest) {
    try {
        json request = json::parse(jsonRequest);
        std::string action = request["action"].get<std::string>();

        if (action == "create") return createTask(request["data"].dump());
        else if (action == "getAll") return getTasks(request["userId"].get<std::string>());
        else if (action == "getById") return getTask(request["taskId"].get<std::string>());
        else if (action == "update") return editTask(request["taskId"].get<std::string>(), request["data"].dump());
        else if (action == "delete") return deleteTask(request["taskId"].get<std::string>());
        else if (action == "undo") return undoLastOperation(request["userId"].get<std::string>());
        else if (action == "undoStatus") return getUndoStatus(request["userId"].get<std::string>());
        else if (action == "undoHistory") return getUndoHistory(request["userId"].get<std::string>());
        
        // Queue operations
        else if (action == "addToQueue") return addToQueue(request["taskId"].get<std::string>());
        else if (action == "processNext") return processNextTask(request["userId"].get<std::string>());
        else if (action == "viewQueue") return viewQueue(request["userId"].get<std::string>());
        else if (action == "queueStatus") return getQueueStatus(request["userId"].get<std::string>());
        
        else {
            json error;
            error["success"] = false;
            error["error"] = "Unknown action: " + action;
            return error.dump();
        }

    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = std::string("Request handling error: ") + e.what();
        return error.dump();
    }
}
