#ifndef QUEUE_H
#define QUEUE_H

#include <string>
#include <stdexcept>

template<typename T>
class Queue {
private:
    struct Node {
        T data;
        Node* next;
        Node(T d) : data(d), next(nullptr) {}
    };
    Node* front;
    Node* rear;
    int size;

public:
    Queue() : front(nullptr), rear(nullptr), size(0) {}
    ~Queue();
    
    void enqueue(T data);
    T dequeue();
    T peek() const;
    bool isEmpty() const { return front == nullptr; }
    int getSize() const { return size; }
    void clear();
};

#endif