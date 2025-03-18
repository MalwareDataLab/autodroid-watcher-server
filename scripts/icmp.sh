#!/bin/bash

# Default values
PACKET_COUNT=100
WORKER_SSH_CONFIG=""
RNP_SSH_CONFIG=""

# Parse command line arguments
usage() {
  echo "Usage: $0 -r FILE [-w FILE] [-c NUM]"
  echo "Options:"
  echo "  -r FILE  Specify SSH config file for RNP hosts (required)"
  echo "  -w FILE  Specify SSH config file for worker hosts (optional)"
  echo "  -c NUM   Number of ping packets (default: 100)"
  echo "  -h       Display this help message"
  exit 1
}

while getopts "w:r:c:h" opt; do
  case $opt in
    w) WORKER_SSH_CONFIG="$OPTARG" ;;
    r) RNP_SSH_CONFIG="$OPTARG" ;;
    c) PACKET_COUNT="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

# Check if required parameters are provided
if [ -z "$RNP_SSH_CONFIG" ]; then
  echo "Error: RNP (-r) SSH config file must be specified."
  usage
fi

# Verify that the SSH config files exist
if [ -n "$WORKER_SSH_CONFIG" ] && [ ! -f "$WORKER_SSH_CONFIG" ]; then
  echo "Error: Worker SSH config file '$WORKER_SSH_CONFIG' does not exist."
  exit 1
fi

if [ ! -f "$RNP_SSH_CONFIG" ]; then
  echo "Error: RNP SSH config file '$RNP_SSH_CONFIG' does not exist."
  exit 1
fi

# Define hosts
WORKER_HOSTS=("w1" "w2" "w3" "w4" "w5")
RNP_HOSTS=("rnp1" "rnp2" "rnp3" "rnp4")
DIRECT_HOSTS=("__IP__")

# Create log directory if it doesn't exist
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/icmp_logs"
mkdir -p "$LOG_DIR"

# Get current timestamp for log files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/icmp_ping_$TIMESTAMP.log"

echo "Starting ICMP ping test to all hosts ($PACKET_COUNT packets each)" | tee -a "$LOG_FILE"
echo "Worker SSH config: ${WORKER_SSH_CONFIG:-Not specified}" | tee -a "$LOG_FILE"
echo "RNP SSH config: ${RNP_SSH_CONFIG:-Not specified}" | tee -a "$LOG_FILE"
echo "Results will be saved to $LOG_FILE"
echo "----------------------------------------" | tee -a "$LOG_FILE"

# Function to ping a host
ping_host() {
  local host=$1
  local ssh_config=$2

  echo "Pinging $host with $PACKET_COUNT packets..." | tee -a "$LOG_FILE"
  if [ -n "$ssh_config" ]; then
    # Extract hostname from SSH config
    host_ip=$(grep -A 10 "^Host[[:space:]]\\+$host\$" "$ssh_config" | grep -i "hostname" | head -1 | awk '{print $2}')

    if [ -z "$host_ip" ]; then
      echo "Could not find HostName for $host in $ssh_config" | tee -a "$LOG_FILE"
      ping_result=1
    else
      echo "Using address $host_ip from SSH config for $host" | tee -a "$LOG_FILE"
      ping -c "$PACKET_COUNT" "$host_ip" >> "$LOG_FILE" 2>&1
      ping_result=$?
    fi
  else
    # Direct ping
    ping -c "$PACKET_COUNT" "$host" >> "$LOG_FILE" 2>&1
    ping_result=$?
  fi

  if [ $ping_result -eq 0 ]; then
    echo "✓ $host is reachable" | tee -a "$LOG_FILE"
    return 0
  else
    echo "✗ $host is unreachable" | tee -a "$LOG_FILE"
    return 1
  fi
  echo "" | tee -a "$LOG_FILE"
}

# Ping worker hosts
echo "Testing Worker Hosts:" | tee -a "$LOG_FILE"
for host in "${WORKER_HOSTS[@]}"; do
  ping_host "$host" "$WORKER_SSH_CONFIG"
done

# Ping RNP hosts
echo "Testing RNP Hosts:" | tee -a "$LOG_FILE"
for host in "${RNP_HOSTS[@]}"; do
  ping_host "$host" "$RNP_SSH_CONFIG"
done

# Ping direct hosts
echo "Testing Direct Hosts:" | tee -a "$LOG_FILE"
for host in "${DIRECT_HOSTS[@]}"; do
  ping_host "$host" ""
done

echo "ICMP ping test completed. Full results in $LOG_FILE"
