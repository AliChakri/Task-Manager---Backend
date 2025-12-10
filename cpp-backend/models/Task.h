#ifndef TASK_H
#define TASK_H

#include <string>
#include <vector>
#include <ctime>

/**
 * Définit le niveau d'importance de la tâche.
 */
enum Priority { 
    LOW = 1,    // Faible priorité
    MEDIUM = 2, // Priorité moyenne
    HIGH = 3    // Haute priorité
};

/**
 * Définit l'état actuel de la tâche dans son cycle de vie.
 */
enum Status { 
    TO_DO,        // À faire (état initial)
    PENDING,      // En attente
    IN_PROGRESS,  // En cours de réalisation
    COMPLETED     // Terminée
};

/**
 * Classe représentant une seule unité de travail. Elle encapsule toutes les propriétés et 
 * les comportements d'une tâche (titre, statut, priorité, dates, etc.).
 */
class Task {
private:
    std::string id;
    std::string title;
    std::string description;
    Priority priority;
    Status status;
    std::vector<std::string> tags;
    bool isFavorite;
    time_t createdAt; // Date de création
    time_t dueDate;   // Date d'échéance
    std::string userId;

public:
    Task* next; // Pointeur utilisé pour lier les tâches dans la structure TaskLinkedList.

    /**
     * Crée une tâche vide avec des valeurs par défaut.
     */
    Task();
    
    /**
     * Initialise une nouvelle tâche avec les informations de base et définit la date de création.
     * tid L'identifiant unique de la tâche.
     * ttitle Le titre de la tâche.
     * desc La description détaillée.
     * pri Le niveau de priorité initial.
     * tUserId L'identifiant de l'utilisateur assigné.
     */
    Task(std::string tid, std::string ttitle, std::string desc, Priority pri, std::string tUserId);

    
    /**
     * Obtenir l'identifiant
     * Retourne L'identifiant de la tâche.
     */
    std::string getId() const;
    
    /**
     * Obtenir le titre
     * Retourne Le titre de la tâche.
     */
    std::string getTitle() const;
    
    /**
     * Obtenir la description
     * Retourne La description de la tâche.
     */
    std::string getDescription() const;
    
    /**
     * Obtenir la priorité
     * Retourne Le niveau de priorité (LOW, MEDIUM, HIGH).
     */
    Priority getPriority() const;
    
    /**
     * Obtenir le statut
     * Retourne L'état actuel de la tâche (TO_DO, IN_PROGRESS, etc.).
     */
    Status getStatus() const;
    
    /**
     * Obtenir les étiquettes (tags)
     * Retourne Un vecteur de chaînes représentant les tags associés.
     */
    std::vector<std::string> getTags() const;
    
    /**
     * Obtenir le statut favori
     * Retourne true si la tâche est marquée comme favorite, false sinon.
     */
    bool getIsFavorite() const;
    
    /**
     * Obtenir la date de création
     * Retourne L'horodatage de création.
     */
    time_t getCreatedAt() const;
    
    /**
     * Obtenir la date d'échéance
     * Retourne L'horodatage de la date d'échéance.
     */
    time_t getDueDate() const;
    
    /**
     * Obtenir l'identifiant utilisateur
     * Retourne L'identifiant de l'utilisateur auquel la tâche est assignée.
     */
    std::string getUserId() const;

    /**
     * Définir le titre
     * t Le nouveau titre.
     */
    void setTitle(const std::string& t);
    
    /**
     * Définir la description
     * d La nouvelle description.
     */
    void setDescription(const std::string& d);
    
    /**
     * Définir la priorité
     * p Le nouveau niveau de priorité.
     */
    void setPriority(Priority p);
    
    /**
     * Définir le statut
     * s Le nouveau statut de la tâche.
     */
    void setStatus(Status s);
    
    /**
     * Définir les étiquettes (tags)
     * t Le vecteur des nouvelles étiquettes.
     */
    void setTags(const std::vector<std::string>& t);
    
    /**
     * Définir le statut favori
     * fav Le statut favori (true/false).
     */
    void setIsFavorite(bool fav);
    
    /**
     * Définir la date d'échéance
     * date Le nouvel horodatage de la date d'échéance.
     */
    void setDueDate(time_t date);

    // Utility
    
    /**
     * Sérialisation en JSON (toJson)
     * Convertit toutes les propriétés de la tâche en une chaîne JSON.
     * Retourne La chaîne JSON représentant la tâche.
     */
    std::string toJson() const;
    
    /**
     * Désérialisation à partir de JSON (fromJson)
     * Met à jour les propriétés de l'objet tâche à partir d'une chaîne JSON.
     * jsonStr La chaîne JSON à parser.
     */
    void fromJson(const std::string& jsonStr);
};

#endif