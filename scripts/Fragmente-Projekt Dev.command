#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd /Users/aliye/Documents/Fragmente-Projekt || exit 1
npm run desktop:dev
if [[ $? -ne 0 ]]; then
  printf '\nUnable to start the development preview. Press Return to close.\n'
  read -r
fi
