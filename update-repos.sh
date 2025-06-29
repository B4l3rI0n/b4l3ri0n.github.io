#!/bin/bash

# Fetch the GitHub API data and save it to data/repos.json
#mkdir -p data
curl -s 'https://api.github.com/users/B4l3rI0n/repos' | jq . > ~/blog/b4l3ri0n.github.io/_data/repos.json

# Check if the file was created successfully
if [ -s _data/repos.json ]; then
    echo "Updated repos.json"
else
    echo "Failed to update repos.json"
    exit 1
fi
