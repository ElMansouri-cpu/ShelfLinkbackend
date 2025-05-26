#!/bin/bash

# Function to display help message
show_help() {
    echo "Usage: ./docker-build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build     Build the Docker images"
    echo "  up        Start the containers"
    echo "  down      Stop and remove the containers"
    echo "  restart   Restart the containers"
    echo "  logs      Show container logs"
    echo "  help      Show this help message"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

# Process commands
case "$1" in
    "build")
        echo "Building Docker images..."
        docker-compose build
        ;;
    "up")
        echo "Starting containers..."
        docker-compose up -d
        ;;
    "down")
        echo "Stopping containers..."
        docker-compose down
        ;;
    "restart")
        echo "Restarting containers..."
        docker-compose restart
        ;;
    "logs")
        echo "Showing container logs..."
        docker-compose logs -f
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 