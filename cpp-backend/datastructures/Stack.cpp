#include "Stack.h"

/**
 * Constructeur
 * Initialise une nouvelle pile vide en définissant le sommet (top) sur nullptr et la taille à zéro.
 */
Stack::Stack() : top(nullptr), size(0) {}

/**
 * Destructeur
 * Libère la mémoire de tous les nœuds de la pile en appelant la fonction clear().
 */
Stack::~Stack() {
    clear();
}

/**
 * Empiler
 * Ajoute un nouvel élément (une opération) au sommet de la pile.
 * op L'opération à ajouter à la pile.
 */
void Stack::push(const Operation& op) {
    StackNode* newNode = new StackNode(op);
    newNode->next = top;
    top = newNode;
    size++;
}

/**
 * Dépiler
 * Retire et retourne l'élément situé au sommet de la pile. Lève une exception si la pile est vide.
 * Retourne L'opération retirée du sommet de la pile.
 */
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

/**
 * Regarder le sommet
 * Retourne l'élément situé au sommet de la pile sans le retirer. Lève une exception si la pile est vide.
 * Retourne L'opération située au sommet de la pile.
 */
Operation Stack::peek() const {
    if (isEmpty()) {
        throw std::runtime_error("Stack is empty");
    }
    return top->data;
}

/**
 * Vérification de vide (est_vide)
 * Vérifie si la pile ne contient aucun élément.
 * Retourne Vrai si la pile est vide, Faux sinon.
 */
bool Stack::isEmpty() const {
    return top == nullptr;
}

/**
 * Nettoyer 
 * Supprime tous les éléments de la pile et libère la mémoire associée à chaque nœud.
 */
void Stack::clear() {
    while (!isEmpty()) {
        pop();
    }
}