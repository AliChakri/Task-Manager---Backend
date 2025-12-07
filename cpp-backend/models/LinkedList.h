#ifndef LINKEDLIST_H
#define LINKEDLIST_H

#include "Task.h"
#include <vector>
#include <string>

class TaskLinkedList {
private:
    Task* head;
    int size;

public:
    TaskLinkedList() : head(nullptr), size(0) {}
    ~TaskLinkedList();
    
    void insert(Task* task);
    bool remove(std::string taskId);
    Task* find(std::string taskId);
    std::vector<Task*> getAll();
    std::vector<Task*> getByUserId(std::string userId);
    void sortByPriority();
    void sortByDueDate();
    std::vector<Task*> filterByStatus(Status status);
    
    int getSize() const { return size; }
    bool isEmpty() const { return head == nullptr; }
    void clear();
};

#endif