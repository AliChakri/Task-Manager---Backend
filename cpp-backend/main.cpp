#include <iostream>
#include <string>
#include "controllers/TaskController.h"

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