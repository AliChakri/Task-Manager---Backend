#ifndef QUEUE_H
#define QUEUE_H

#include <string>
#include <stdexcept>

/**
 * Implémentation d'une structure de données File en utilisant une liste chaînée, respectant le principe FIFO.
 */
template<typename T>
class Queue {
private:
    struct Node {
        T data;
        Node* next;
        
        /**
         * Constructeur de nœud
         * d La donnée à stocker.
         */
        Node(T d) : data(d), next(nullptr) {}
    };
    Node* front;
    Node* rear;
    int size;

public:
    /**
     * Initialise la file vide.
     */
    Queue() : front(nullptr), rear(nullptr), size(0) {}
    
    /**
     * Gère la libération de la mémoire de tous les nœuds de la file.
     */
    ~Queue();
    
    /**
     * Enfiler
     * Ajoute un élément à l'arrière de la file.
     * data L'élément de type T à ajouter.
     */
    void enqueue(T data);
    
    /**
     * Défiler
     * Retire et retourne l'élément situé à l'avant de la file.
     * Retourne L'élément de type T retiré.
     */
    T dequeue();
    
    /**
     * Regarder l'avant (Peek)
     * Retourne l'élément situé à l'avant de la file sans le retirer.
     * Retourne L'élément de type T à l'avant.
     */
    T peek() const;
    
    /**
     * Est vide
     * Vérifie si la file ne contient aucun élément.
     * Retourne Vrai si la file est vide, Faux sinon.
     */
    bool isEmpty() const { return front == nullptr; }
    
    /**
     * Obtenir la taille
     * Retourne le nombre d'éléments dans la file.
     * Retourne La taille de la file.
     */
    int getSize() const { return size; }
    
    /**
     * Supprime tous les éléments de la file et libère la mémoire.
     */
    void clear();
};

#endif