#ifndef STACK_H
#define STACK_H

#include "../models/Operation.h"

/**
 * 
 * Représente un nœud individuel dans la pile. Chaque nœud contient une donnée (Operation) et un pointeur vers le nœud suivant.
 */
struct StackNode {
    Operation data;
    StackNode* next;

    /**
     * Constructeur de nœud
     * op L'opération (donnée) à stocker dans le nœud.
     */
    StackNode(const Operation& op) : data(op), next(nullptr) {}
};

/**
 * 
 * Implémentation d'une structure de données Pile (Stack) en utilisant une liste chaînée, respectant le principe LIFO.
 */
class Stack {
private:
    StackNode* top;
    int size;

public:
    /**
     * Initialise une pile vide.
     */
    Stack();
    
    /**
     * Gère la libération de la mémoire de tous les nœuds de la pile.
     */
    ~Stack();

    /**
     * Empiler
     * Ajoute un élément au sommet de la pile.
     * op L'opération à ajouter.
     */
    void push(const Operation& op);
    
    /**
     * Dépiler
     * Retire et retourne l'élément au sommet de la pile.
     * Retourne L'opération retirée.
     */
    Operation pop();
    
    /**
     * Regarder le sommet (Peek)
     * Retourne l'élément au sommet sans le retirer.
     * Retourne L'opération au sommet.
     */
    Operation peek() const;

    /**
     * Est vide
     * Vérifie si la pile ne contient aucun élément.
     * Retourne Vrai si la pile est vide, Faux sinon.
     */
    bool isEmpty() const;
    
    /**
     * Nettoyer
     * Supprime tous les éléments de la pile et libère la mémoire.
     */
    void clear();
    
    /**
     * Obtenir la taille
     * Retourne le nombre d'éléments dans la pile.
     * Retourne La taille de la pile.
     */
    int getSize() const { return size; }
};

#endif