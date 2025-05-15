#!/bin/bash
# This script performs a rollback to the previous working version

TIMESTAMP=$(date +%Y%m%d%H%M%S)
CURRENT_RELEASE=$(readlink -f ~/fin-invoice-ocr-team6/current)

# Find the second newest release (previous version)
PREV_RELEASE=$(find ~/fin-invoice-ocr-team6/releases -maxdepth 1 -mindepth 1 -type d | sort -r | sed -n 2p)

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
        echo "Using backup: $LATEST_BACKUP"
        mkdir -p ~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
        tar -xzf $LATEST_BACKUP -C ~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
        PREV_RELEASE=~/fin-invoice-ocr-team6/releases/rollback-$TIMESTAMP
    else
        echo "No backups found!"
        exit 1
    fi
else
    echo "Using previous release: $PREV_RELEASE"
fi

# Update current symlink to previous release
ln -sfn $PREV_RELEASE ~/fin-invoice-ocr-team6/current
echo "Updated current symlink to: $(readlink -f ~/fin-invoice-ocr-team6/current)"

# Restart application with delete + start approach (same as deployment)
cd ~/fin-invoice-ocr-team6/current/backend
pm2 delete invoice-ocr-backend || true
pm2 start server.js --name invoice-ocr-backend --watch --ignore-watch="uploads"
pm2 save

echo "Rollback completed successfully"
echo "Application should now be running from: $(readlink -f ~/fin-invoice-ocr-team6/current)"

# Verify application is running
sleep 2
curl -s localhost:3000/health || echo "Warning: Health check failed. Please verify application manually."