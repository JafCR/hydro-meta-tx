#!/bin/bash
echo $PWD
rm -rf ./geth/geth_datadir/geth
docker -D run \
    -v /$PWD/geth:/geth \
    -a STDERR \
    ethereum/client-go:v1.9.11 \
    init ./geth/genesis.json --datadir ./geth/geth_datadir 

docker -D run \
    -v /$PWD/geth:/geth \
    -a STDERR \
    -p 8545:8545 \
    -p 8546:8546 \
    -p 30303:30303 \
    ethereum/client-go:v1.9.11 \
    --allow-insecure-unlock \
    --rpc --datadir ./geth/geth_datadir/ \
    --rpcapi "eth,net,web3,admin,personal,miner" \
    --nodiscover \
    --miner.gastarget 8000000 \
    --mine \
    --miner.threads 1 \
    --miner.etherbase 0xdc5ceee4a36133a4b31285675545cd230b09a5c4 \
    js ./geth/geth_script.js &

    sleep 500
