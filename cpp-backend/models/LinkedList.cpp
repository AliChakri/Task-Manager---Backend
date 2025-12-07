#include "LinkedList.h"
#include <algorithm>

TaskLinkedList::~TaskLinkedList() {
    clear();
}

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
    size++;
}

bool TaskLinkedList::remove(std::string taskId) {
    if (!head) return false;
    
    // If head is the target
    if (head->getId() == taskId) {
        Task* temp = head;
        head = head->next;
        delete temp;
        size--;
        return true;
    }
    
    // Search for the task
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

std::vector<Task*> TaskLinkedList::getAll() {
    std::vector<Task*> tasks;
    Task* current = head;
    
    while (current) {
        tasks.push_back(current);
        current = current->next;
    }
    
    return tasks;
}

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

void TaskLinkedList::clear() {
    while (head) {
        Task* temp = head;
        head = head->next;
        delete temp;
    }
    size = 0;
}