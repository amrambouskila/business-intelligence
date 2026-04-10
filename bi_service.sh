#!/usr/bin/env bash
set -e

# ============================================================
#              CONFIGURATION (EDIT THESE ONLY)
# ============================================================
SERVICE_PREFIX="business-intelligence"
COMPOSE_FILE="docker-compose.yml"

# ============================================================
#                     RUN DOCKER COMPOSE
# ============================================================
echo "Starting Docker Compose..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo ""
echo "=============================="
echo "Service running."
echo "Press k + Enter = stop but keep image"
echo "Press q + Enter = stop & remove image"
echo "Press v + Enter = stop, remove image & volumes"
echo "=============================="

while true; do
    read -rp "Enter selection (k/q/v): " CHOICE
    CHOICE=$(printf '%s' "$CHOICE" | tr '[:upper:]' '[:lower:]')
    case "$CHOICE" in
        k) break ;;
        q) break ;;
        v) break ;;
        *) echo "Invalid selection. Enter k, q, or v." ;;
    esac
done

# ============================================================
#                 STOP BUT KEEP IMAGE
# ============================================================
if [[ "$CHOICE" == "k" ]]; then
    echo ""
    echo "Stopping containers but keeping images..."
    docker compose -f "$COMPOSE_FILE" down
    exit 0
fi

# ============================================================
#         FULL CLEANUP: STOP + REMOVE IMAGES (NO VOLUMES)
# ============================================================
if [[ "$CHOICE" == "q" ]]; then
    echo ""
    echo "Stopping and removing all containers..."
    docker compose -f "$COMPOSE_FILE" down --remove-orphans
fi

# ============================================================
#   FULL CLEANUP WITH VOLUMES: STOP + VOLUMES + IMAGES
# ============================================================
if [[ "$CHOICE" == "v" ]]; then
    echo ""
    echo "Stopping and removing all containers and volumes..."
    docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
fi

# ============================================================
#       SHARED IMAGE REMOVAL LOGIC (USED BY q AND v)
# ============================================================
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
