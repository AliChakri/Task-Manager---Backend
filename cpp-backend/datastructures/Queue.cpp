#include "Queue.h"

/**
 * Destructeur
 * Libère la mémoire de tous les nœuds de la file en appelant la fonction clear().
 * 
 */
template<typename T>
Queue<T>::~Queue() {
    clear();
}

/**
 * Enfiler
 * Ajoute un nouvel élément à l'arrière (rear) de la file (FIFO).
 * data L'élément à ajouter à la file.
 */
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

/**
 * Défiler
 * Retire et retourne l'élément situé à l'avant (front) de la file. Lève une exception si la file est vide.
 * Retourne L'élément retiré de l'avant de la file.
 */
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

/**
 * Regarder l'avant
 * Retourne l'élément situé à l'avant (front) de la file sans le retirer. Lève une exception si la file est vide.
 * Retourne L'élément situé à l'avant de la file.
 */
template<typename T>
T Queue<T>::peek() const {
    if (isEmpty()) {
        throw std::runtime_error("Queue is empty");
    }
    return front->data;
}

/**
 * Nettoyer
 * Supprime tous les éléments de la file et libère la mémoire associée à chaque nœud.
 */
template<typename T>
void Queue<T>::clear() {
    while (!isEmpty()) {
        dequeue();
    }
}

// Instanciation explicite des types supportés
template class Queue<std::string>;
template class Queue<int>;