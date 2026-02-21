#!/usr/bin/env bash
# Build Docker images for NetWorth Navigator and create deployment package.
# Images are versioned with timestamp: NetWorth Navigator yyyymmdd.hhmmss
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Version format: yyyymmdd.hhmmss
VERSION=$(date +"%Y%m%d.%H%M%S")
IMAGE_NAME="networth-navigator"
BACKEND_IMAGE="${IMAGE_NAME}-backend:${VERSION}"
FRONTEND_IMAGE="${IMAGE_NAME}-frontend:${VERSION}"

# Output directory
OUTPUT_DIR="/home/ewout/Documents/NetWorth-Navigator-images"
ARCHIVE_DIR="${OUTPUT_DIR}/archive"
mkdir -p "$OUTPUT_DIR"
mkdir -p "$ARCHIVE_DIR"

echo "Building NetWorth Navigator images (version: ${VERSION})..."
echo ""

# Build backend image
echo "Building backend image..."
docker build -f src/NetWorthNavigator.Backend/Dockerfile -t "$BACKEND_IMAGE" .

# Build frontend image
echo "Building frontend image..."
docker build -f src/NetWorthNavigator.Frontend/Dockerfile -t "$FRONTEND_IMAGE" .

# Save images as tar files
BACKEND_TAR="${OUTPUT_DIR}/${IMAGE_NAME}-backend-${VERSION}.tar"
FRONTEND_TAR="${OUTPUT_DIR}/${IMAGE_NAME}-frontend-${VERSION}.tar"

echo "Saving images..."
docker save "$BACKEND_IMAGE" -o "$BACKEND_TAR"
docker save "$FRONTEND_IMAGE" -o "$FRONTEND_TAR"
echo "Saved: $(basename "$BACKEND_TAR")"
echo "Saved: $(basename "$FRONTEND_TAR")"

# Archive old networth-navigator.yml if it exists (before creating new one)
COMPOSE_FILE="${OUTPUT_DIR}/networth-navigator.yml"
if [ -f "$COMPOSE_FILE" ]; then
  mv "$COMPOSE_FILE" "${ARCHIVE_DIR}/networth-navigator-$(date +"%Y%m%d.%H%M%S").yml" 2>/dev/null || true
fi

# Create deployment networth-navigator.yml
cat > "$COMPOSE_FILE" <<EOF
services:
  backend:
    image: ${BACKEND_IMAGE}
    container_name: networth-backend
    ports:
      - "5000:5000"
    volumes:
      - backend-data:/data
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Data Source=/data/networth.db

  frontend:
    image: ${FRONTEND_IMAGE}
    container_name: networth-frontend
    ports:
      - "6000:80"
    depends_on:
      - backend

volumes:
  backend-data:
EOF

echo "Created: networth-navigator.yml"
echo ""

# Archive old versions (keep only the latest in main directory)
echo "Archiving old versions..."
# Archive old image tar files (keep current version)
find "$OUTPUT_DIR" -maxdepth 1 -type f -name "${IMAGE_NAME}-*.tar" ! -name "*${VERSION}*" -exec mv {} "$ARCHIVE_DIR/" \; 2>/dev/null || true

echo ""
echo "Build complete!"
echo "Version: ${VERSION}"
echo "Images saved to: ${OUTPUT_DIR}"
echo ""
echo "To load and run locally:"
echo "  cd ${OUTPUT_DIR}"
echo "  docker load -i $(basename "$BACKEND_TAR")"
echo "  docker load -i $(basename "$FRONTEND_TAR")"
echo "  docker compose -f networth-navigator.yml up -d"
echo ""
echo "Old versions archived to: ${ARCHIVE_DIR}"
