#ifndef TASK_H
#define TASK_H

#include <string>
#include <vector>
#include <ctime>

enum Priority { LOW = 1, MEDIUM = 2, HIGH = 3 };
enum Status { TO_DO, PENDING, IN_PROGRESS, COMPLETED };

class Task {
private:
    std::string id;
    std::string title;
    std::string description;
    Priority priority;
    Status status;
    std::vector<std::string> tags;
    bool isFavorite;
    time_t createdAt;
    time_t dueDate;
    std::string userId;

public:
    Task* next;

    // **Only declare constructors here**
    Task();
    Task(std::string tid, std::string ttitle, std::string desc, Priority pri, std::string tUserId);

    // Getters
    std::string getId() const;
    std::string getTitle() const;
    std::string getDescription() const;
    Priority getPriority() const;
    Status getStatus() const;
    std::vector<std::string> getTags() const;
    bool getIsFavorite() const;
    time_t getCreatedAt() const;
    time_t getDueDate() const;
    std::string getUserId() const;

    // Setters
    void setTitle(const std::string& t);
    void setDescription(const std::string& d);
    void setPriority(Priority p);
    void setStatus(Status s);
    void setTags(const std::vector<std::string>& t);
    void setIsFavorite(bool fav);
    void setDueDate(time_t date);

    // Utility
    std::string toJson() const;
    void fromJson(const std::string& jsonStr);
};

#endif
