#!/bin/bash
export SUPABASE_ACCESS_TOKEN="${1}"
shift
exec "$@"
