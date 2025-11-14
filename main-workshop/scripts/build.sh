#!/bin/bash
# Simple build script for all services

set -e

LANGUAGE=${1:-""}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🔨 Building services..."

cd "$PROJECT_ROOT"

build_dotnet() {
    if [ -d "services/dotnet" ]; then
        echo "Building .NET services..."
        find services/dotnet -name "*.csproj" -not -path "*/test/*" | while read project; do
            project_dir=$(dirname "$project")
            echo "  Building $(basename "$project_dir")..."
            cd "$project_dir"
            dotnet publish -c Release -r linux-x64 --self-contained false -o publish > /dev/null
            cd "$PROJECT_ROOT"
        done
    fi
}

build_java() {
    if [ -d "services/java" ]; then
        echo "Building Java services..."
        find services/java/**/* -name "pom.xml" | while read pom; do
            project_dir=$(dirname "$pom")
            echo "  Building $(basename "$project_dir")..."
            cd "$project_dir"
            mvn clean package -DskipTests > /dev/null
            cd "$PROJECT_ROOT"
        done
    fi
}

build_python() {
    if [ -d "services/python" ]; then
        echo "Python is using layer"
    fi
}

build_typescript() {
    if [ -d "services/typescript" ]; then
        echo "Building TypeScript services..."
        cd services/typescript
        echo "  Installing dependencies..."
        npm install
        npm run build --workspaces
    fi
}

case "$LANGUAGE" in
    "dotnet") build_dotnet ;;
    "java") build_java ;;
    "python") build_python ;;
    "typescript") build_typescript ;;
    "") 
        build_dotnet
        build_java
        build_python
        build_typescript
        ;;
    *) echo "❌ Unknown language: $LANGUAGE"; exit 1 ;;
esac

echo "✅ Build completed!"
