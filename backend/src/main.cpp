#include "crow.h"
#include "crow/middlewares/cors.h"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <functional>
#include <limits>
#include <queue>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

struct Edge {
  std::string to;
  double metres;
};

struct Step {
  std::string from;
  std::string to;
  double metres;
  double effective;
};

using Graph = std::unordered_map<std::string, std::vector<Edge>>;

static Graph make_graph() {
  Graph graph;

  auto add = [&graph](const std::string& a, const std::string& b, double metres) {
    graph[a].push_back({b, metres});
    graph[b].push_back({a, metres});
  };

  add("R & E Block", "Main", 120);
  add("Statue", "Main", 70);
  add("L Block", "Main", 110);
  add("Main", "A Block", 140);
  add("L Block", "Open Audit", 80);
  add("Open Audit", "A Block", 75);
  add("L Block", "Library", 60);
  add("Library", "Open Audit", 90);
  add("Open Audit", "Canteen", 85);
  add("A Block", "Canteen", 55);
  add("Library", "Cricket Ground", 100);
  add("Cricket Ground", "Football Ground", 130);
  add("Football Ground", "Canteen", 95);

  return graph;
}

int main() {
  const Graph graph = make_graph();

  const std::unordered_map<std::string, double> multipliers{
      {"Low", 1.0},
      {"Moderate", 1.3},
      {"High", 1.7}
  };

  crow::App<crow::CORSHandler> app;

  app.get_middleware<crow::CORSHandler>()
      .global()
      .origin("*")
      .methods(crow::HTTPMethod::Get, crow::HTTPMethod::Post);

  CROW_ROUTE(app, "/health").methods(crow::HTTPMethod::Get)([] {
    return crow::response(
        200,
        "application/json",
        R"({"status":"ok"})");
  });

  CROW_ROUTE(app, "/route")
      .methods(crow::HTTPMethod::Post)(
          [&graph, &multipliers](const crow::request& request) {
            auto body = crow::json::load(request.body);

            if (!body ||
                !body.has("source") ||
                !body.has("destination") ||
                !body.has("crowd")) {
              return crow::response(
                  400,
                  crow::json::wvalue{
                      {"error", "Expected source, destination, and crowd."}});
            }

            const std::string source = body["source"].s();
            const std::string destination = body["destination"].s();
            const std::string crowd = body["crowd"].s();

            const auto factor = multipliers.find(crowd);

            if (factor == multipliers.end()) {
              return crow::response(
                  400,
                  crow::json::wvalue{
                      {"error", "Crowd must be Low, Moderate, or High."}});
            }

            if (!graph.count(source) || !graph.count(destination)) {
              return crow::response(
                  400,
                  crow::json::wvalue{
                      {"error", "Source or destination is not a campus location."}});
            }

            using QueueItem = std::pair<double, std::string>;
            std::priority_queue<
                QueueItem,
                std::vector<QueueItem>,
                std::greater<QueueItem>> queue;

            std::unordered_map<std::string, double> costs;
            std::unordered_map<std::string, std::string> previous;

            for (const auto& node : graph) {
              costs[node.first] = std::numeric_limits<double>::infinity();
            }

            costs[source] = 0;
            queue.push({0, source});

            // Dijkstra minimizes the sum of distance * crowd multiplier.
            while (!queue.empty()) {
              const auto [cost, node] = queue.top();
              queue.pop();

              if (cost > costs[node]) {
                continue;
              }

              if (node == destination) {
                break;
              }

              for (const auto& edge : graph.at(node)) {
                const double candidate =
                    cost + edge.metres * factor->second;

                if (candidate < costs[edge.to]) {
                  costs[edge.to] = candidate;
                  previous[edge.to] = node;
                  queue.push({candidate, edge.to});
                }
              }
            }

            std::vector<std::string> route;

            for (std::string at = destination;; at = previous.at(at)) {
              route.push_back(at);

              if (at == source) {
                break;
              }
            }

            std::reverse(route.begin(), route.end());

            std::vector<Step> steps;
            double totalMetres = 0;

            for (size_t i = 1; i < route.size(); ++i) {
              const std::string& from = route[i - 1];
              const std::string& to = route[i];

              const auto edge = std::find_if(
                  graph.at(from).begin(),
                  graph.at(from).end(),
                  [&to](const Edge& candidate) {
                    return candidate.to == to;
                  });

              totalMetres += edge->metres;

              steps.push_back({
                  from,
                  to,
                  edge->metres,
                  edge->metres * factor->second
              });
            }

            crow::json::wvalue result;

            // Crow's JSON writer represents arrays with wvalue::list.
            crow::json::wvalue::list routeJson;
            for (const auto& node : route) {
              routeJson.emplace_back(node);
            }
            result["route"] = std::move(routeJson);

            crow::json::wvalue::list segmentsJson;
            for (const auto& step : steps) {
              crow::json::wvalue segment;
              segment["from"] = step.from;
              segment["to"] = step.to;
              segment["distance"] = step.metres;
              segment["crowd"] = crowd;
              segment["multiplier"] = factor->second;
              segment["effectiveCost"] = step.effective;

              segmentsJson.emplace_back(std::move(segment));
            }
            result["segments"] = std::move(segmentsJson);

            result["distance"] = totalMetres;
            result["effectiveCost"] = costs[destination];
            result["estimatedMinutes"] =
                std::round((totalMetres / 80.0) * 10.0) / 10.0;
            result["crowd"] = crowd;
            result["multiplier"] = factor->second;

            return crow::response(200, result);
          });

  const char* portEnvironment = std::getenv("PORT");
  const int port = portEnvironment ? std::stoi(portEnvironment) : 8080;

  app.port(port)
      .bindaddr("0.0.0.0")
      .multithreaded()
      .run();
}