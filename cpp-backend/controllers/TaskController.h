#ifndef TASKCONTROLLER_H
#define TASKCONTROLLER_H

#include "../models/Task.h"
#include "../models/LinkedList.h"
#include "../models/Operation.h"
#include "../datastructures/Stack.h"
#include "../datastructures/Queue.h"
#include <string>

/**
 * Agit comme le contrôleur principal pour la gestion des tâches. Il gère la logique métier, 
 * l'interaction avec les différentes structures de données (Liste Chaînée, Pile, File) 
 * et l'interface d'entrée/sortie via JSON. 
 */
class TaskController {
private:
    TaskLinkedList taskList; 
    Stack undoStack;
    Queue<std::string> processingQueue;
    int nextId;
    const int MAX_UNDO_SIZE = 20;

    /**
     * Pousser l'opération d'annulation
     * Fonction interne pour enregistrer une opération sur la pile d'annulation, en respectant la taille maximale.
     * op L'objet Operation décrivant l'action à annuler.
     */
    void pushUndo(const Operation& op);

public:
    /**
     * Initialise le contrôleur.
     */
    TaskController() : nextId(1) {}

    // Core CRUD Operations

    /**
     * Créer une tâche
     * Crée une nouvelle tâche à partir des données JSON.
     * jsonData Chaîne JSON contenant les détails de la nouvelle tâche.
     * Retourne Réponse JSON.
     */
    std::string createTask(const std::string& jsonData);

    /**
     * Obtenir toutes les tâches pour un utilisateur
     * Récupère la liste des tâches d'un utilisateur.
     * userId L'identifiant de l'utilisateur.
     * Retourne Réponse JSON contenant la liste des tâches.
     */
    std::string getTasks(const std::string& userId);

    /**
     * Obtenir une seule tâche
     * Récupère une tâche spécifique par son ID.
     * taskId L'identifiant de la tâche.
     * Retourne Réponse JSON contenant les données de la tâche.
     */
    std::string getTask(const std::string& taskId);

    /**
     * Mettre à jour une tâche
     * Modifie les propriétés d'une tâche existante.
     * taskId L'identifiant de la tâche à modifier.
     * jsonData Chaîne JSON contenant les champs à mettre à jour.
     * Retourne Réponse JSON.
     */
    std::string editTask(const std::string& taskId, const std::string& jsonData);

    /**
     * Supprimer une tâche
     * Supprime une tâche de la liste.
     * taskId L'identifiant de la tâche à supprimer.
     * Retourne Réponse JSON.
     */
    std::string deleteTask(const std::string& taskId);

    // Undo

    /**
     * Annuler la dernière opération
     * Déclenche l'action inverse de la dernière opération enregistrée dans la pile.
     * userId L'identifiant de l'utilisateur.
     * Retourne Réponse JSON indiquant le succès de l'annulation.
     */
    std::string undoLastOperation(const std::string& userId);

    /**
     * Obtenir le statut de l'annulation
     * Vérifie si une opération peut être annulée.
     * userId L'identifiant de l'utilisateur.
     * Retourne Réponse JSON indiquant si l'annulation est disponible.
     */
    std::string getUndoStatus(const std::string& userId);

    /**
     * Obtenir l'historique d'annulation
     * Fournit des détails sur la dernière opération annulable.
     * userId L'identifiant de l'utilisateur.
     * Retourne Réponse JSON avec les données de l'opération.
     */
    std::string getUndoHistory(const std::string& userId);

    // Processing Queue

    /**
     * Ajouter à la file de traitement
     * Ajoute une tâche à la file pour un traitement séquentiel.
     * taskId L'identifiant de la tâche à ajouter.
     * Retourne Réponse JSON.
     */
    std::string addToQueue(const std::string& taskId);

    /**
     * Traiter la prochaine tâche
     * Retire la tâche la plus ancienne de la file et commence son traitement (par exemple, changer son statut).
     * userId L'identifiant de l'utilisateur.
     * Retourne Réponse JSON.
     */
    std::string processNextTask(const std::string& userId);

    /**
     * Voir la file
     * Donne un aperçu de l'état actuel de la file de traitement.
     * userId L'identifiant de l'utilisateur.
     * Retourne Réponse JSON.
     */
    std::string viewQueue(const std::string& userId);

    /**
     * Retirer de la file
     * Retire une tâche spécifique de la file (si implémenté).
     * taskId L'identifiant de la tâche à retirer.
     * Retourne Réponse JSON.
     */
    std::string removeFromQueue(const std::string& taskId);

    /**
     * Obtenir le statut de la file
     * Fournit des métadonnées sur la file (taille, état).
     * userId L'identifiant de l'utilisateur.
     * Retourne Réponse JSON.
     */
    std::string getQueueStatus(const std::string& userId);

    // Command router

    /**
     * Gérer la requête
     * Point d'entrée unique pour toutes les requêtes, qui délègue l'exécution à la méthode appropriée en fonction du champ 'action' dans le JSON.
     * jsonRequest Chaîne JSON contenant l'action et les données.
     * Retourne Le résultat de l'opération en format JSON.
     */
    std::string handleRequest(const std::string& jsonRequest);
};

#endif