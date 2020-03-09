#!/bin/bash

rm -rf ./geth_datadir/geth
geth init ./genesis.json --datadir ./geth_datadir
geth  --allow-insecure-unlock   --rpc --datadir ./geth_datadir/ --rpcapi "eth,net,web3,admin,personal,miner" --nodiscover  --miner.gastarget 8000000 --mine --miner.threads 1 --miner.etherbase 0xdc5ceee4a36133a4b31285675545cd230b09a5c4 js ./geth_script.js
