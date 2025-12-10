#include "Task.h"
#include <nlohmann/json.hpp>
#include <sstream>

using json = nlohmann::json;

/**
 * Initialise une tâche avec des valeurs de base, en définissant la date de création à l'heure actuelle et l'état à PENDING.
 */
Task::Task() 
    : id(""), title(""), description(""), priority(MEDIUM), status(PENDING),
      tags(), isFavorite(false), createdAt(std::time(nullptr)), dueDate(0), 
      userId(""), next(nullptr)
{
}

/**
 * Initialise une nouvelle tâche avec les données obligatoires fournies.
 * tid L'identifiant unique de la tâche.
 * ttitle Le titre de la tâche.
 * desc La description détaillée.
 * pri Le niveau de priorité initial.
 * tUserId L'identifiant de l'utilisateur.
 */
Task::Task(std::string tid, std::string ttitle, std::string desc, Priority pri, std::string tUserId) 
    : id(tid), title(ttitle), description(desc), priority(pri), status(PENDING),
      tags(), isFavorite(false), createdAt(std::time(nullptr)), dueDate(0),
      userId(tUserId), next(nullptr)
{
}

/**
 * Obtenir l'identifiant
 * Retourne L'identifiant de la tâche.
 */
std::string Task::getId() const { return id; }

/**
 * Obtenir le titre
 * Retourne Le titre de la tâche.
 */
std::string Task::getTitle() const { return title; }

/**
 * Obtenir la description
 * Retourne La description de la tâche.
 */
std::string Task::getDescription() const { return description; }

/**
 * Obtenir la priorité
 * Retourne Le niveau de priorité (LOW, MEDIUM, HIGH).
 */
Priority Task::getPriority() const { return priority; }

/**
 * Obtenir le statut
 * Retourne L'état actuel de la tâche (TO_DO, IN_PROGRESS, etc.).
 */
Status Task::getStatus() const { return status; }

/**
 * Obtenir les étiquettes (tags)
 * Retourne Le vecteur de chaînes représentant les tags.
 */
std::vector<std::string> Task::getTags() const { return tags; }

/**
 * Obtenir le statut favori
 * Retourne true si la tâche est marquée comme favorite, false sinon.
 */
bool Task::getIsFavorite() const { return isFavorite; }

/**
 * Obtenir la date de création
 * Retourne L'horodatage de création.
 */
time_t Task::getCreatedAt() const { return createdAt; }

/**
 * Obtenir la date d'échéance
 * Retourne L'horodatage de la date d'échéance.
 */
time_t Task::getDueDate() const { return dueDate; }

/**
 * Obtenir l'identifiant utilisateur
 * Retourne L'identifiant de l'utilisateur.
 */
std::string Task::getUserId() const { return userId; }


/**
 * Définir le titre
 * t Le nouveau titre.
 */
void Task::setTitle(const std::string& t) { title = t; }

/**
 * Définir la description
 * d La nouvelle description.
 */
void Task::setDescription(const std::string& d) { description = d; }

/**
 * Définir la priorité
 * p Le nouveau niveau de priorité.
 */
void Task::setPriority(Priority p) { priority = p; }

/**
 * Définir le statut
 * s Le nouveau statut de la tâche.
 */
void Task::setStatus(Status s) { status = s; }

/**
 * Définir les étiquettes (tags)
 * t Le vecteur des nouvelles étiquettes.
 */
void Task::setTags(const std::vector<std::string>& t) { tags = t; }

/**
 * Définir le statut favori
 * fav Le statut favori (true/false).
 */
void Task::setIsFavorite(bool fav) { isFavorite = fav; }

/**
 * Définir la date d'échéance
 * date Le nouvel horodatage de la date d'échéance.
 */
void Task::setDueDate(time_t date) { dueDate = date; }

/**
 * Convertit toutes les propriétés de la tâche en une chaîne JSON.
 * Retourne La chaîne JSON représentant la tâche.
 */
std::string Task::toJson() const {
    json j;
    j["id"] = id;
    j["title"] = title;
    j["description"] = description;
    j["priority"] = priority;
    j["status"] = status;
    j["isFavorite"] = isFavorite;
    j["tags"] = tags;
    j["createdAt"] = createdAt;
    j["dueDate"] = dueDate;
    j["userId"] = userId;
    return j.dump();
}

/**
 * Met à jour les propriétés de l'objet tâche à partir d'une chaîne JSON.
 * jsonStr La chaîne JSON à parser.
 */
void Task::fromJson(const std::string& jsonStr) {
    try {
        json j = json::parse(jsonStr);
        
        if (j.contains("id")) id = j["id"].get<std::string>();
        if (j.contains("title")) title = j["title"].get<std::string>();
        if (j.contains("description")) description = j["description"].get<std::string>();
        if (j.contains("priority")) priority = static_cast<Priority>(j["priority"].get<int>());
        if (j.contains("status")) status = static_cast<Status>(j["status"].get<int>());
        if (j.contains("isFavorite")) isFavorite = j["isFavorite"].get<bool>();
        if (j.contains("tags") && j["tags"].is_array()) {
            tags.clear();
            for (const auto& tag : j["tags"]) {
                tags.push_back(tag.get<std::string>());
            }
        }
        if (j.contains("userId")) userId = j["userId"].get<std::string>();
        if (j.contains("dueDate")) dueDate = j["dueDate"].get<time_t>();
        
    } catch (const std::exception& e) {
    }
}