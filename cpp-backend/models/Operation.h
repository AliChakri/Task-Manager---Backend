#ifndef OPERATION_H
#define OPERATION_H

#include <string>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

/**
 * Énumération définissant les différents types d'actions qui peuvent être enregistrées et annulées.
 */
enum OperationType { 
    CREATE,    // Création d'une nouvelle tâche
    UPDATE,    // Modification d'une tâche existante
    DELETE_OP  // Suppression d'une tâche
};

/**
 * Structure de données représentant une action unique effectuée sur le système de gestion des tâches. 
 * Utilisée principalement pour le mécanisme d'annulation (Undo).
 */
struct Operation {
    OperationType type;        // Le type d'opération (CREATE, UPDATE, DELETE_OP).
    std::string taskId;        // L'identifiant de la tâche affectée.
    std::string previousState; // L'état de la tâche AVANT l'opération (sauvegardé en JSON).
    std::string newState;      // L'état de la tâche APRÈS l'opération (sauvegardé en JSON).
    std::string userId;        // L'utilisateur qui a effectué l'opération.
    time_t timestamp;          // Le moment où l'opération a été enregistrée.

    /**
     * Initialise l'opération au type CREATE avec un timestamp à zéro.
     */
    Operation() : type(CREATE), timestamp(0) {}
    
    /**
     * Initialise et enregistre une nouvelle opération avec un horodatage (timestamp) actuel.
     * t Le type d'opération.
     * id L'ID de la tâche.
     * prev L'état précédent (JSON).
     * newS L'état actuel (JSON).
     * uid L'ID de l'utilisateur.
     */
    Operation(OperationType t, std::string id, std::string prev, std::string newS, std::string uid)
        : type(t), taskId(id), previousState(prev), newState(newS), userId(uid) {
        timestamp = time(nullptr);
    }

    /**
     * Convertit l'objet Operation en une chaîne de caractères JSON pour le stockage ou le transport.
     * Retourne La chaîne JSON représentant l'objet Operation.
     */
    std::string toJson() const {
        json j;
        j["type"] = type;
        j["taskId"] = taskId;
        j["previousState"] = previousState;
        j["newState"] = newState;
        j["userId"] = userId;
        j["timestamp"] = timestamp;
        return j.dump();
    }

    /**
     * Fonction statique qui reconstruit un objet Operation à partir d'une chaîne JSON.
     * jsonStr La chaîne JSON à parser.
     * Retourne L'objet Operation reconstruit.
     */
    static Operation fromJson(const std::string& jsonStr) {
        Operation op;
        try {
            json j = json::parse(jsonStr);
            op.type = static_cast<OperationType>(j["type"].get<int>());
            op.taskId = j["taskId"].get<std::string>();
            op.previousState = j["previousState"].get<std::string>();
            op.newState = j["newState"].get<std::string>();
            op.userId = j["userId"].get<std::string>();
            op.timestamp = j["timestamp"].get<time_t>();
        } catch (...) {}
        return op;
    }
};

#endif