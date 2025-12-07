#include "Task.h"
#include <nlohmann/json.hpp>
#include <sstream>

using json = nlohmann::json;

Task::Task() 
    : id(""), title(""), description(""), priority(MEDIUM), status(PENDING),
      tags(), isFavorite(false), createdAt(std::time(nullptr)), dueDate(0), 
      userId(""), next(nullptr)
{
}

// Parameterized constructor
Task::Task(std::string tid, std::string ttitle, std::string desc, Priority pri, std::string tUserId) 
    : id(tid), title(ttitle), description(desc), priority(pri), status(PENDING),
      tags(), isFavorite(false), createdAt(std::time(nullptr)), dueDate(0),
      userId(tUserId), next(nullptr)
{
}

// Getters
std::string Task::getId() const { return id; }
std::string Task::getTitle() const { return title; }
std::string Task::getDescription() const { return description; }
Priority Task::getPriority() const { return priority; }
Status Task::getStatus() const { return status; }
std::vector<std::string> Task::getTags() const { return tags; }
bool Task::getIsFavorite() const { return isFavorite; }
time_t Task::getCreatedAt() const { return createdAt; }
time_t Task::getDueDate() const { return dueDate; }
std::string Task::getUserId() const { return userId; }

// Setters
void Task::setTitle(const std::string& t) { title = t; }
void Task::setDescription(const std::string& d) { description = d; }
void Task::setPriority(Priority p) { priority = p; }
void Task::setStatus(Status s) { status = s; }
void Task::setTags(const std::vector<std::string>& t) { tags = t; }
void Task::setIsFavorite(bool fav) { isFavorite = fav; }
void Task::setDueDate(time_t date) { dueDate = date; }

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
        // Handle JSON parsing error
    }
}