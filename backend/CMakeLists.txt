cmake_minimum_required(VERSION 3.20)
project(campus_api LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CROW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(CROW_BUILD_TESTS OFF CACHE BOOL "" FORCE)

include(FetchContent)
FetchContent_Declare(Crow
  GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
  GIT_TAG v1.2.1
  GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(Crow)

add_executable(campus-api src/main.cpp)
target_link_libraries(campus-api PRIVATE Crow::Crow)
if(WIN32)
  target_link_libraries(campus-api PRIVATE ws2_32)
endif()
