#include "LinkedList.h"
#include <algorithm>

/**
 * Destructeur
 * Libère la mémoire allouée à tous les nœuds (tâches) de la liste chaînée lorsque l'objet TaskLinkedList est détruit.
 */
TaskLinkedList::~TaskLinkedList() {
    // Appel à la fonction 'clear' pour supprimer tous les nœuds
    clear();
}

/**
 * Insertion d'une tâche
 * Ajoute une nouvelle tâche à la fin de la liste chaînée simple.
 */
void TaskLinkedList::insert(Task* task) {
    if (!task) return;
    
    task->next = nullptr;
    
    if (!head) {
        head = task;
    } else {
        Task* current = head;
        while (current->next) {
            current = current->next;
        }
        current->next = task;
    }
}

/**
 * Suppression d'une tâche
 * Recherche une tâche par son Task ID et la supprime de la liste chaînée, libérant la mémoire associée.
 * Task Id L'identifiant de la tâche à supprimer.
 * Retourne Vrai si la tâche a été trouvée et supprimée, Faux sinon.
 */
bool TaskLinkedList::remove(std::string taskId) {

    if (!head) return false;
    
    if (head->getId() == taskId) {
        Task* temp = head; 
        head = head->next;
        delete temp;
        size--;
        return true;
    }
    
    Task* current = head;

    while (current->next) {
        if (current->next->getId() == taskId) {

            Task* temp = current->next; 
            current->next = temp->next;
            delete temp;
            size--;
            return true;
        }
        current = current->next;
    }
    
    return false;
}

/**
 * Recherche d'une tâche
 * Recherche une tâche dans la liste chaînée par son Task ID.
 * Task ID L'identifiant de la tâche à rechercher.
 * Retourne Un pointeur vers la tâche trouvée, ou nullptr si elle n'est pas trouvée.
 */
Task* TaskLinkedList::find(std::string taskId) {
    Task* current = head;
    
    while (current) {
        if (current->getId() == taskId) {
            return current;
        }
        current = current->next;
    }
    return nullptr;
}

/**
 * Récupérer toutes les tâches
 * Parcourt la liste chaînée et retourne toutes les tâches dans un vecteur.
 * Retourne Un Vector de pointeurs vers toutes les tâches.
 */
std::vector<Task*> TaskLinkedList::getAll() {
    std::vector<Task*> tasks;
    Task* current = head;
    
    while (current) {
        tasks.push_back(current);
        current = current->next;
    }
    
    return tasks;
}

/**
 * Filtrer par ID utilisateur
 * Parcourt la liste chaînée et retourne toutes les tâches associées à un ID utilisateur spécifique.
 * UserId L'identifiant de l'utilisateur.
 * Retourne Un vecteur de pointeurs vers les tâches de cet utilisateur.
 */
std::vector<Task*> TaskLinkedList::getByUserId(std::string userId) {
    std::vector<Task*> tasks;
    Task* current = head;
    
    while (current) {
        if (current->getUserId() == userId) {
            tasks.push_back(current);
        }
        current = current->next;
    }
    
    return tasks;
}

/**
 * Trier par priorité
 * Trie la liste chaînée par priorité décroissante (la priorité la plus haute en premier) en utilisant une implémentation de tri à bulles adaptée aux listes chaînées (échange des nœuds).
 */
void TaskLinkedList::sortByPriority() {

    if (!head || !head->next) return;
    
    bool swapped;
    do {
        swapped = false;
        Task* current = head;
        Task* prev = nullptr;
        Task* next = head->next;
        
        while (next) {

            if (current->getPriority() < next->getPriority()) {
                swapped = true;
                
                if (prev) {
                    Task* temp = next->next;
                    prev->next = next;
                    next->next = current;
                    current->next = temp;
                } else {
                    Task* temp = next->next;
                    head = next;
                    next->next = current;
                    current->next = temp;
                }
                
                prev = next;
                next = current->next;
            } else {
                prev = current;
                current = next;
                next = next->next;
            }
        }
    } while (swapped);
}

/**
 * Trier par date d'échéance (Due Date)
 * Trie la liste chaînée par date d'échéance croissante (la plus ancienne en premier) en utilisant un tri à bulles (échange des nœuds). Ignore les tâches sans date définie (valeur 0).
 */
void TaskLinkedList::sortByDueDate() {

    if (!head || !head->next) return;
    
    bool swapped;
    do {
        swapped = false;
        Task* current = head;
        Task* prev = nullptr;
        Task* next = head->next;
        
        while (next) {

            if (current->getDueDate() > next->getDueDate() && next->getDueDate() != 0) {
                swapped = true;
                
                if (prev) {
                    Task* temp = next->next;
                    prev->next = next;
                    next->next = current;
                    current->next = temp;
                } else {
                    Task* temp = next->next;
                    head = next;
                    next->next = current;
                    current->next = temp;
                }
                
                prev = next;
                next = current->next;
            } else {
                prev = current;
                current = next;
                next = next->next;
            }
        }
    } while (swapped);
}

/**
 * Filtrer par statut
 * Parcourt la liste chaînée et retourne toutes les tâches ayant un statut spécifié.
 * Retourne Un vecteur de pointeurs vers les tâches filtrées.
 */
std::vector<Task*> TaskLinkedList::filterByStatus(Status status) {
    std::vector<Task*> filtered;
    Task* current = head;
    
    while (current) {
        if (current->getStatus() == status) {
            filtered.push_back(current);
        }
        current = current->next;
    }
    
    return filtered;
}

/**
 * Nettoyer la liste
 * Supprime tous les nœuds de la liste chaînée, libérant la mémoire et réinitialisant la liste à un état vide.
 */
void TaskLinkedList::clear() {
    while (head) {
        Task *temp = head;
        head = head->next;
        delete temp; 
    }
    size = 0;
}