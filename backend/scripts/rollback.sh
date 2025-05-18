#!/bin/bash
# This script performs a rollback to the previous working version with MySQL database restore

# Load environment variables
if [ -f ~/fin-invoice-ocr-team6/shared/.env ]; then
  echo "Loading environment variables from .env file"
  source ~/fin-invoice-ocr-team6/shared/.env
fi

TIMESTAMP=$(date +%Y%m%d%H%M%S)
CURRENT_RELEASE=$(readlink -f ~/fin-invoice-ocr-team6/current)

# Find the second newest release (previous version)
PREV_RELEASE=$(find ~/fin-invoice-ocr-team6/releases -maxdepth 1 -mindepth 1 -type d | sort -r | sed -n 2p)

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

# Check if we have a backup to restore
if [ -z "$PREV_RELEASE" ] && [ ! -d ~/fin-invoice-ocr-team6/backups ]; then
    echo "No previous release or backup found to roll back to!"
    exit 1
fi

echo "Rolling back from $CURRENT_RELEASE"

# If no previous release but we have a backup
if [ -z "$PREV_RELEASE" ] && [ -d ~/fin-invoice-ocr-team6/backups ]; then
    LATEST_BACKUP=$(find ~/fin-invoice-ocr-team6/backups -name "backup-*.tar.gz" -type f | sort -r | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        echo "Using code backup: $LATEST_BACKUP"
        mkdir -p ~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
        tar -xzf $LATEST_BACKUP -C ~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
        PREV_RELEASE=~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
    else
        echo "No code backups found!"
        exit 1
    fi
else
    echo "Using previous release: $PREV_RELEASE"
fi

# Restore MySQL database before updating symlink
echo "Restoring MySQL database to previous state..."
restore_mysql_database

# Update current symlink to previous release
ln -sfn $PREV_RELEASE ~/fin-invoice-ocr-team6/current
echo "Updated current symlink to: $(readlink -f ~/fin-invoice-ocr-team6/current)"

# Restart application with delete + start approach (same as deployment)
cd ~/fin-invoice-ocr-team6/current/backend
pm2 delete invoice-ocr-backend || true
pm2 start server.js --name invoice-ocr-backend
pm2 save

echo "Rollback completed successfully"
echo "Application should now be running from: $(readlink -f ~/fin-invoice-ocr-team6/current)"

# Verify application is running
sleep 2
echo "Performing health check..."
HEALTH_CHECK=$(curl -s localhost:3000/health)
echo "Health check response: $HEALTH_CHECK"
STATUS=$(echo $HEALTH_CHECK | grep -o "\"status\":\"ok\"" || echo "failed")

if [ "$STATUS" = "\"status\":\"ok\"" ]; then
  echo "✅ Rollback health check passed! Application is running successfully."
else
  echo "⚠️ Warning: Health check failed after rollback. Please verify application manually."
fi