#!/usr/bin/env bash

cd "$(dirname "$0")"

while true; do
printf "Running Server...\n"
node server.js
sleep 1
printf "Sleeping 10...\n"
sleep 9
done

cd -