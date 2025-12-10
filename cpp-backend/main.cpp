#include <iostream>
#include <string>
#include "controllers/TaskController.h"

/**
 * Point d'entrée de l'application. Elle initialise le contrôleur de tâches et entre dans 
 * une boucle de lecture/écriture pour traiter les requêtes entrantes via l'entrée standard (stdin). 
 * Elle sert de couche d'interface console simple pour le TaskController.
 * 
 * Retourne 0 si le programme se termine correctement.
 */
int main() {
    TaskController controller;
    std::string line;
    
    while (std::getline(std::cin, line)) {

        if (line.empty()) continue;
        
        try {
            std::string response = controller.handleRequest(line);
            
            std::cout << response << std::endl;

            std::cout.flush();
            
        } catch (const std::exception& e) {
            std::cout << "{\"success\":false,\"error\":\"" 
                      << e.what() << "\"}" << std::endl;
            std::cout.flush();
        }
    }
    
    return 0;
}
