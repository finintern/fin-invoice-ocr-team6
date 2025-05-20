#!/bin/bash
# Script for Blue-Green Deployment Rollback

# Default values
ROLLBACK_VERSION=""
GREEN_PORT=3005
BLUE_PORT=3000

# Process command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --version)
      ROLLBACK_VERSION="$2"
      shift # past argument
      shift # past value
      ;;
    --help)
      echo "Usage: $0 [--version VERSION_ID]"
      echo ""
      echo "Options:"
      echo "  --version VERSION_ID   Roll back to a specific version"
      echo "  --help                 Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Load environment variables
if [ -f ~/fin-invoice-ocr-team6/shared/.env ]; then
  echo "Loading environment variables from .env file"
  source ~/fin-invoice-ocr-team6/shared/.env
fi

TIMESTAMP=$(date +%Y%m%d%H%M%S)
CURRENT_BLUE=$(readlink -f ~/fin-invoice-ocr-team6/environments/blue/current)
CURRENT_GREEN=$(readlink -f ~/fin-invoice-ocr-team6/environments/green/current)
CURRENT_MAIN=$(readlink -f ~/fin-invoice-ocr-team6/current || echo "")

echo "Current Blue environment: $CURRENT_BLUE"
echo "Current Green environment: $CURRENT_GREEN"
echo "Current main symlink: $CURRENT_MAIN"

# Determine the version to roll back to
if [ -n "$ROLLBACK_VERSION" ]; then
  echo "Rolling back to specified version: $ROLLBACK_VERSION"
  TARGET_RELEASE=~/fin-invoice-ocr-team6/releases/$ROLLBACK_VERSION
  
  if [ ! -d "$TARGET_RELEASE" ]; then
    echo "Error: Release version $ROLLBACK_VERSION not found!"
    echo "Available versions:"
    ls -1 ~/fin-invoice-ocr-team6/releases/
    exit 1
  fi
else
  # Find the second newest release (previous version)
  PREV_RELEASE=$(find ~/fin-invoice-ocr-team6/releases -maxdepth 1 -mindepth 1 -type d | sort -r | sed -n 2p)
  
  if [ -z "$PREV_RELEASE" ]; then
    echo "No previous release found to roll back to!"
    
    # Check if we have backups
    if [ -d ~/fin-invoice-ocr-team6/backups ]; then
      LATEST_BACKUP=$(find ~/fin-invoice-ocr-team6/backups -name "backup-*.tar.gz" -type f | sort -r | head -n1)
      if [ -n "$LATEST_BACKUP" ]; then
        echo "Using code backup: $LATEST_BACKUP"
        mkdir -p ~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
        tar -xzf $LATEST_BACKUP -C ~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
        TARGET_RELEASE=~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
      else
        echo "No code backups found!"
        exit 1
      fi
    else
      echo "No backups directory found!"
      exit 1
    fi
  else
    echo "Using previous release: $PREV_RELEASE"
    TARGET_RELEASE=$PREV_RELEASE
  fi
fi

# MySQL database restore function
restore_mysql_database() {
  echo "Starting MySQL database restoration process..."
  
  # Find the latest backup
  LATEST_BACKUP=$(find ~/fin-invoice-ocr-team6/db_backups -type f -name "backup-*.sql" | sort -r | head -n1)
  
  if [ -z "$LATEST_BACKUP" ]; then
    echo "No MySQL database backup found! Skipping database restore."
    return 1
  fi
  
  echo "Found MySQL backup: $LATEST_BACKUP"
  echo "Size: $(du -h $LATEST_BACKUP | cut -f1) - Date: $(stat -c %y $LATEST_BACKUP)"
  
  # Install mysql client if needed
  which mysql >/dev/null || sudo apt-get -y install mysql-client
  
  echo "Restoring MySQL database $DB_NAME on $DB_HOST..."
  mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < "$LATEST_BACKUP"
  RESTORE_RESULT=$?
  
  if [ $RESTORE_RESULT -eq 0 ]; then
    echo "✅ MySQL database restored successfully"
    return 0
  else
    echo "❌ MySQL database restore failed with code $RESTORE_RESULT"
    return $RESTORE_RESULT
  fi
}

# Restore MySQL database before deploying
echo "Restoring MySQL database to previous state..."
restore_mysql_database

# Roll back Green environment (staging - port 3005)
echo "Rolling back Green environment (port $GREEN_PORT)..."
rm -rf ~/fin-invoice-ocr-team6/environments/green/current/*
cp -R $TARGET_RELEASE/* ~/fin-invoice-ocr-team6/environments/green/current/

# Set up symlinks for Green
cd ~/fin-invoice-ocr-team6/environments/green/current/backend
ln -sf ~/fin-invoice-ocr-team6/shared/.env ./.env
ln -sf ~/fin-invoice-ocr-team6/shared/newrelic.js ./newrelic.js
ln -sf ~/fin-invoice-ocr-team6/shared/uploads ./uploads

# Restart Green environment with New Relic
pm2 stop invoice-ocr-backend-green || true
pm2 delete invoice-ocr-backend-green || true

# Start Green with New Relic integration
PORT=$GREEN_PORT \
NEW_RELIC_ENABLED=true \
NEW_RELIC_APP_NAME=invoice-ocr-backend-green \
NEW_RELIC_LICENSE_KEY=$(grep NEW_RELIC_LICENSE_KEY .env | cut -d"=" -f2 || echo "") \
DEPLOYMENT_COLOR=green \
pm2 start server.js --name invoice-ocr-backend-green --node-args="-r newrelic"

echo "Verifying Green environment health..."
sleep 5
GREEN_HEALTH=$(curl -s http://localhost:$GREEN_PORT/health)
echo "Green health check response: $GREEN_HEALTH"
GREEN_STATUS=$(echo $GREEN_HEALTH | grep -o "\"status\":\"ok\"" || echo "failed")

if [ "$GREEN_STATUS" = "\"status\":\"ok\"" ]; then
  echo "✅ Green environment rollback successful!"
else
  echo "❌ Green environment health check failed after rollback!"
  echo "Proceeding with Blue rollback anyway..."
fi

# Roll back Blue environment (production - port 3000)
echo "Rolling back Blue environment (port $BLUE_PORT)..."
rm -rf ~/fin-invoice-ocr-team6/environments/blue/current/*
cp -R $TARGET_RELEASE/* ~/fin-invoice-ocr-team6/environments/blue/current/

# Set up symlinks for Blue
cd ~/fin-invoice-ocr-team6/environments/blue/current/backend
ln -sf ~/fin-invoice-ocr-team6/shared/.env ./.env
ln -sf ~/fin-invoice-ocr-team6/shared/newrelic.js ./newrelic.js
ln -sf ~/fin-invoice-ocr-team6/shared/uploads ./uploads

# Update current symlink to point to the target release
ln -sfn $TARGET_RELEASE ~/fin-invoice-ocr-team6/current

# Restart Blue environment with New Relic
pm2 stop invoice-ocr-backend-blue || true
pm2 delete invoice-ocr-backend-blue || true

# Start Blue with New Relic integration
PORT=$BLUE_PORT \
NEW_RELIC_ENABLED=true \
NEW_RELIC_APP_NAME=invoice-ocr-backend-blue \
NEW_RELIC_LICENSE_KEY=$(grep NEW_RELIC_LICENSE_KEY .env | cut -d"=" -f2 || echo "") \
DEPLOYMENT_COLOR=blue \
pm2 start server.js --name invoice-ocr-backend-blue --node-args="-r newrelic"

# Also restart the default app with New Relic (for backwards compatibility)
pm2 stop invoice-ocr-backend || true
pm2 delete invoice-ocr-backend || true

PORT=$BLUE_PORT \
NEW_RELIC_ENABLED=true \
NEW_RELIC_APP_NAME=invoice-ocr-backend \
NEW_RELIC_LICENSE_KEY=$(grep NEW_RELIC_LICENSE_KEY .env | cut -d"=" -f2 || echo "") \
DEPLOYMENT_COLOR=blue \
pm2 start server.js --name invoice-ocr-backend --node-args="-r newrelic"

pm2 save

echo "Verifying Blue environment health..."
sleep 5
BLUE_HEALTH=$(curl -s http://localhost:$BLUE_PORT/health)
echo "Blue health check response: $BLUE_HEALTH"
BLUE_STATUS=$(echo $BLUE_HEALTH | grep -o "\"status\":\"ok\"" || echo "failed")

if [ "$BLUE_STATUS" = "\"status\":\"ok\"" ]; then
  echo "✅ Blue environment rollback successful!"
else
  echo "❌ Blue environment health check failed after rollback!"
fi

# Final status
echo "============================================="
echo "Rollback Summary:"
echo "Target release: $(basename $TARGET_RELEASE)"
echo "Green environment status: $GREEN_STATUS"
echo "Blue environment status: $BLUE_STATUS"
echo "============================================="

# Exit with the appropriate code
if [ "$BLUE_STATUS" = "\"status\":\"ok\"" ] || [ "$GREEN_STATUS" = "\"status\":\"ok\"" ]; then
  echo "Rollback completed with at least one environment successfully running."
  exit 0
else
  echo "Rollback failed! Both environments failed health checks."
  exit 1
fi