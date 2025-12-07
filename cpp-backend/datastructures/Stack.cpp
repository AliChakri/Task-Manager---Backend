#include "Stack.h"

Stack::Stack() : top(nullptr), size(0) {}

Stack::~Stack() {
    clear();
}

void Stack::push(const Operation& op) {
    StackNode* newNode = new StackNode(op);
    newNode->next = top;
    top = newNode;
    size++;
}

Operation Stack::pop() {
    if (isEmpty()) {
        throw std::runtime_error("Stack is empty");
    }
    
    StackNode* temp = top;
    Operation data = top->data;
    top = top->next;
    delete temp;
    size--;
    
    return data;
}

Operation Stack::peek() const {
    if (isEmpty()) {
        throw std::runtime_error("Stack is empty");
    }
    return top->data;
}

bool Stack::isEmpty() const {
    return top == nullptr;
}

void Stack::clear() {
    while (!isEmpty()) {
        pop();
    }
}