#!/bin/bash
# Watches for pending jobs and notifies via a marker file
JOBS_DIR="$(dirname "$0")/jobs"
while true; do
  for status_file in "$JOBS_DIR"/*-status.json; do
    [ -f "$status_file" ] || continue
    status=$(python3 -c "import json; print(json.load(open('$status_file'))['status'])" 2>/dev/null)
    if [ "$status" = "pending" ]; then
      job_id=$(basename "$status_file" | sed 's/-status.json//')
      echo "PENDING JOB: $job_id"
    fi
  done
  sleep 30
done
