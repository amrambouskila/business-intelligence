#!/usr/bin/env bash
set -e

# ============================================================
#              CONFIGURATION (EDIT THESE ONLY)
# ============================================================
SERVICE_PREFIX="business-intelligence"
COMPOSE_FILE="docker-compose.yml"
PORT="${BI_PORT:-5176}"
URL="http://localhost:$PORT"

# ============================================================
#                    HELPER FUNCTIONS
# ============================================================

start_service() {
    echo "Starting Docker Compose..."
    docker compose -f "$COMPOSE_FILE" up --build -d
}

remove_images() {
    echo ""
    echo "Searching for images starting with \"$SERVICE_PREFIX\"..."

    FOUND=0
    for IMAGE in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -i "^${SERVICE_PREFIX}"); do
        echo "Found image: $IMAGE"
        echo "Removing image $IMAGE..."
        docker rmi -f "$IMAGE" 2>/dev/null || true
        FOUND=1
    done

    if [[ $FOUND -eq 0 ]]; then
        echo "No images found matching prefix \"$SERVICE_PREFIX\"."
    fi
}

show_menu() {
    echo ""
    echo "=============================="
    echo "Service running at $URL"
    echo ""
    echo "  k = stop (keep image)"
    echo "  q = stop + remove image"
    echo "  v = stop + remove image + volumes"
    echo "  r = full restart (stop, remove, rebuild, relaunch)"
    echo "=============================="
}

# ============================================================
#                     START THE SERVICE
# ============================================================

start_service
show_menu

# ============================================================
#                     MAIN LOOP
# ============================================================

while true; do
    read -rp "Enter selection (k/q/v/r): " CHOICE
    CHOICE=$(printf '%s' "$CHOICE" | tr '[:upper:]' '[:lower:]')

    case "$CHOICE" in
        k)
            echo ""
            echo "Stopping containers but keeping images..."
            docker compose -f "$COMPOSE_FILE" down
            echo "Done."
            exit 0
            ;;
        q)
            echo ""
            echo "Stopping and removing all containers..."
            docker compose -f "$COMPOSE_FILE" down --remove-orphans
            remove_images
            echo "Done."
            exit 0
            ;;
        v)
            echo ""
            echo "Stopping and removing all containers and volumes..."
            docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
            remove_images
            echo "Done."
            exit 0
            ;;
        r)
            echo ""
            echo "=== FULL RESTART ==="
            docker compose -f "$COMPOSE_FILE" down --remove-orphans
            remove_images
            echo ""
            start_service
            show_menu
            ;;
        *)
            echo "Invalid selection. Enter k, q, v, or r."
            ;;
    esac
done
