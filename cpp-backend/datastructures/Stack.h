#ifndef STACK_H
#define STACK_H

#include "../models/Operation.h"

struct StackNode {
    Operation data;
    StackNode* next;

    StackNode(const Operation& op) : data(op), next(nullptr) {}
};

class Stack {
private:
    StackNode* top;
    int size;

public:
    Stack();
    ~Stack();

    void push(const Operation& op);
    Operation pop();
    Operation peek() const;

    bool isEmpty() const;
    void clear();
    int getSize() const { return size; }
};

#endif