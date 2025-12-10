#include "TaskController.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <limits>

using json = nlohmann::json;

/**
 * Pousser l'opération d'annulation (pushUndo)
 * Ajoute une opération d'annulation au sommet de la pile 'undoStack'. 
 * Cette implémentation simple ne conserve qu'une seule opération (niveau d'annulation unique).
 * op L'objet Operation décrivant l'action à annuler.
 */
void TaskController::pushUndo(const Operation& op) {
    if (!undoStack.isEmpty()) {
        undoStack.pop();
    }
    undoStack.push(op);
}


/**
 * Créer une tâche
 * Traite une requête JSON pour créer une nouvelle tâche, l'insère dans la liste chaînée et gère la réponse.
 * jsonData Chaîne JSON contenant les détails de la nouvelle tâche.
 * Retourne Une chaîne JSON indiquant le succès ou l'échec de l'opération.
 */
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

/**
 * Obtenir toutes les tâches pour un utilisateur
 * Récupère toutes les tâches associées à un ID utilisateur spécifique en utilisant la liste chaînée.
 * userId L'identifiant de l'utilisateur.
 * Retourne Une chaîne JSON contenant la liste des tâches ou un message d'erreur.
 */
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

/**
 * Obtenir une seule tâche par ID
 * Recherche une tâche spécifique dans la liste chaînée par son ID.
 * taskId L'identifiant de la tâche à récupérer.
 * Retourne Une chaîne JSON contenant la tâche ou un message d'erreur si elle n'est pas trouvée.
 */
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

/**
 * Mettre à jour une tâche
 * Met à jour les propriétés d'une tâche existante à partir des données JSON. L'état précédent est sauvegardé pour l'annulation.
 * taskId L'identifiant de la tâche à modifier.
 * jsonData Chaîne JSON contenant les champs de la tâche à mettre à jour.
 * Retourne Une chaîne JSON indiquant le succès ou l'échec.
 */
std::string TaskController::editTask(const std::string& taskId, const std::string& jsonData) {
    try {
        Task* task = taskList.find(taskId);
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

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

/**
 * Supprimer une tâche
 * Recherche une tâche par ID, la sauvegarde pour l'annulation (Undo) et la retire de la liste chaînée.
 * taskId L'identifiant de la tâche à supprimer.
 * Retourne Une chaîne JSON indiquant le succès ou l'échec de la suppression.
 */
std::string TaskController::deleteTask(const std::string& taskId) {
    try {
        Task* task = taskList.find(taskId);
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

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

/**
 * Annuler la dernière opération
 * Retire la dernière opération de la pile 'undoStack' et applique l'action inverse (créer/supprimer/restaurer l'état).
 * userId L'identifiant de l'utilisateur (utilisé pour le contexte).
 * Retourne Une chaîne JSON indiquant le succès de l'annulation ou l'absence d'opération à annuler.
 */
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
            case CREATE:
                taskList.remove(op.taskId);
                break;

            case DELETE_OP: {
                
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

            case UPDATE: {
                json j = json::parse(op.previousState);
                
                taskList.remove(op.taskId);
                
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

/**
 * Obtenir le statut de l'annulation
 * Vérifie si une opération d'annulation est disponible dans la pile.
 * userId L'identifiant de l'utilisateur.
 * Retourne Une chaîne JSON indiquant si l'annulation est possible (`hasUndo`).
 */
std::string TaskController::getUndoStatus(const std::string& userId) {
    json response;
    response["success"] = true;
    response["hasUndo"] = !undoStack.isEmpty();
    return response.dump();
}

/**
 * Obtenir l'historique d'annulation
 * Retourne les détails de la dernière opération pouvant être annulée (en respectant la limite 1-niveau).
 * userId L'identifiant de l'utilisateur.
 * Retourne Une chaîne JSON avec les informations de la dernière opération ou `nullptr`.
 */
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

/**
 * Ajouter une tâche à la file de traitement
 * Recherche une tâche par ID et l'ajoute à la file de traitement (`processingQueue`), si son statut le permet.
 * taskId L'identifiant de la tâche à mettre en file.
 * Retourne Une chaîne JSON indiquant le succès et la taille actuelle de la file.
 */
std::string TaskController::addToQueue(const std::string& taskId) {
    try {
        Task* task = taskList.find(taskId);
        
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

        if (task->getStatus() != TO_DO && task->getStatus() != PENDING) {
            json error;
            error["success"] = false;
            error["error"] = "Only TO_DO or PENDING tasks can be added to queue";
            return error.dump();
        }

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

/**
 * Traiter la prochaine tâche
 * Retire la tâche la plus ancienne de la file (`processingQueue.dequeue()`) et met à jour son statut à IN_PROGRESS.
 * userId L'identifiant de l'utilisateur.
 * Retourne Une chaîne JSON avec les détails de la tâche démarrée ou un message d'erreur.
 */
std::string TaskController::processNextTask(const std::string& userId) {
    try {
        if (processingQueue.isEmpty()) {
            json error;
            error["success"] = false;
            error["error"] = "Processing queue is empty";
            return error.dump();
        }

        std::string taskId = processingQueue.dequeue();
        Task* task = taskList.find(taskId);
        
        if (!task) {
            json error;
            error["success"] = false;
            error["error"] = "Task not found";
            return error.dump();
        }

        if (task->getUserId() != userId) {
            json error;
            error["success"] = false;
            error["error"] = "Task does not belong to this user";
            return error.dump();
        }

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

/**
 * Voir la file de traitement
 * Retourne l'état actuel de la file de traitement (taille et si elle est vide).
 * userId L'identifiant de l'utilisateur.
 * Retourne Une chaîne JSON avec les informations sur la file.
 */
std::string TaskController::viewQueue(const std::string& userId) {
    try {
        json response;
        response["success"] = true;
        response["queueSize"] = processingQueue.getSize();
        response["isEmpty"] = processingQueue.isEmpty();
        
        return response.dump();
        
    } catch (const std::exception& e) {
        json error;
        error["success"] = false;
        error["error"] = e.what();
        return error.dump();
    }
}

/**
 * Obtenir le statut de la file
 * Retourne des informations de base sur la file de traitement, y compris sa taille et sa disponibilité.
 * userId L'identifiant de l'utilisateur.
 * Retourne Une chaîne JSON avec le statut de la file.
 */
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

/**
 * Gérer la requête (Point d'entrée principal)
 * Reçoit une requête JSON, identifie l'action demandée (ex: "create", "update", "undo"), et délègue l'exécution à la méthode appropriée.
 * jsonRequest Chaîne JSON contenant l'action et les données nécessaires.
 * Retourne Le résultat de la méthode appelée, formaté en JSON.
 */
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
