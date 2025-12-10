#ifndef LINKEDLIST_H
#define LINKEDLIST_H

#include "Task.h"
#include <vector>
#include <string>

/**
 * Implémentation d'une structure de liste chaînée simple pour gérer une collection d'objets Task. 
 * Elle permet l'insertion, la suppression, la recherche, et le tri des tâches.
 */
class TaskLinkedList {
private:
    Task* head;
    int size;

public:
    TaskLinkedList() : head(nullptr), size(0) {}
    
    /**
     * Gère la libération de la mémoire de tous les nœuds de la liste.
     */
    ~TaskLinkedList();
    
    /**
     * Insertion
     * Ajoute un nouvel objet Task à la fin de la liste.
     * Task Pointeur vers l'objet Task à insérer.
     */
    void insert(Task* task);
    
    /**
     * Suppression
     * Recherche une tâche par son ID et la retire de la liste.
     * Task ID L'identifiant unique de la tâche à supprimer.
     * Retourne true si la suppression a réussi, false sinon.
     */
    bool remove(std::string taskId);
    
    /**
     * Recherche
     * Localise et retourne un pointeur vers la tâche correspondant à l'ID spécifié.
     * Task ID L'identifiant unique de la tâche à rechercher.
     * Retourne Pointeur vers la Task trouvée, ou nullptr si elle n'existe pas.
     */
    Task* find(std::string taskId);
    
    /**
     * Obtenir toutes les tâches
     * Parcourt la liste et retourne toutes les tâches sous forme de vecteur.
     * Retourne Un vecteur de pointeurs vers toutes les tâches.
     */
    std::vector<Task*> getAll();
    
    /**
     * Filtrer par utilisateur
     * Récupère toutes les tâches assignées à un utilisateur spécifique.
     * userId L'identifiant de l'utilisateur.
     * Retourne Un vecteur de pointeurs vers les tâches de cet utilisateur.
     */
    std::vector<Task*> getByUserId(std::string userId);
    
    /**
     * Trier par priorité
     * Réorganise les nœuds de la liste pour trier les tâches par priorité (généralement décroissante).
     */
    void sortByPriority();
    
    /**
     * Trier par date d'échéance
     * Réorganise les nœuds de la liste pour trier les tâches par date d'échéance (généralement croissante).
     */
    void sortByDueDate();
    
    /**
     * Filtrer par statut
     * Récupère toutes les tâches ayant le statut spécifié (par exemple, 'Terminé', 'En cours').
     * status Le statut de la tâche.
     * Retourne Un vecteur de pointeurs vers les tâches correspondantes.
     */
    std::vector<Task*> filterByStatus(Status status);
    
    /**
     * Obtenir la taille
     * Retourne le nombre d'éléments dans la liste.
     * Retourne La taille de la liste.
     */
    int getSize() const { return size; }
    
    /**
     * Est vide
     * Vérifie si la liste ne contient aucun élément.
     * Retournce Vrai si la liste est vide, Faux sinon.
     */
    bool isEmpty() const { return head == nullptr; }
    
    /**
     * Nettoyer
     * Supprime tous les nœuds de la liste et libère la mémoire.
     */
    void clear();
};

#endif