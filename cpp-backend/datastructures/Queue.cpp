#include "Queue.h"

template<typename T>
Queue<T>::~Queue() {
    clear();
}

template<typename T>
void Queue<T>::enqueue(T data) {
    Node* newNode = new Node(data);
    
    if (isEmpty()) {
        front = rear = newNode;
    } else {
        rear->next = newNode;
        rear = newNode;
    }
    size++;
}

template<typename T>
T Queue<T>::dequeue() {
    if (isEmpty()) {
        throw std::runtime_error("Queue is empty");
    }
    
    Node* temp = front;
    T data = front->data;
    front = front->next;
    
    if (!front) {
        rear = nullptr;
    }
    
    delete temp;
    size--;
    
    return data;
}

template<typename T>
T Queue<T>::peek() const {
    if (isEmpty()) {
        throw std::runtime_error("Queue is empty");
    }
    return front->data;
}

template<typename T>
void Queue<T>::clear() {
    while (!isEmpty()) {
        dequeue();
    }
}

// Explicit instantiation
template class Queue<std::string>;
template class Queue<int>;