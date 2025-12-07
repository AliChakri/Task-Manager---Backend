#ifndef OPERATION_H
#define OPERATION_H

#include <string>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

enum OperationType { CREATE, UPDATE, DELETE_OP };

struct Operation {
    OperationType type;
    std::string taskId;
    std::string previousState;
    std::string newState;
    std::string userId;
    time_t timestamp;

    Operation() : type(CREATE), timestamp(0) {}
    
    Operation(OperationType t, std::string id, std::string prev, std::string newS, std::string uid)
        : type(t), taskId(id), previousState(prev), newState(newS), userId(uid) {
        timestamp = time(nullptr);
    }

    std::string toJson() const {
        json j;
        j["type"] = type;
        j["taskId"] = taskId;
        j["previousState"] = previousState;
        j["newState"] = newState;
        j["userId"] = userId;
        j["timestamp"] = timestamp;
        return j.dump();
    }

    static Operation fromJson(const std::string& jsonStr) {
        Operation op;
        try {
            json j = json::parse(jsonStr);
            op.type = static_cast<OperationType>(j["type"].get<int>());
            op.taskId = j["taskId"].get<std::string>();
            op.previousState = j["previousState"].get<std::string>();
            op.newState = j["newState"].get<std::string>();
            op.userId = j["userId"].get<std::string>();
            op.timestamp = j["timestamp"].get<time_t>();
        } catch (...) {}
        return op;
    }
};

#endif