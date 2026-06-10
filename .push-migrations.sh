#!/bin/bash
# Read token from first argument and run supabase db push
export SUPABASE_ACCESS_TOKEN="$1"
shift
cd /Users/brianking/drinksearcher-repo
npx supabase db push "$@"
