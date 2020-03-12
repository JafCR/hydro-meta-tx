#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

run_geth() {
  docker run \
    -v /$PWD/scripts:/scripts \
    -d \
    -p 8545:8545 \
    -p 8546:8546 \
    -p 30303:30303 \
    ethereum/client-go:v1.9.3 \
    --rpc \
    --rpcaddr '0.0.0.0' \
    --rpcport 8545 \
    --rpccorsdomain '*' \
    --ws \
    --wsaddr '0.0.0.0' \
    --wsorigins '*' \
    --nodiscover \
    --dev \
    --dev.period 0 \
    --allow-insecure-unlock \
    --targetgaslimit '7000000' \
    js ./scripts/geth-accounts.js 
#> /dev/null &
}

run_geth
sleep 60