#!/bin/bash
set -e
OUTDIR="/Users/brianking/drinksearcher-repo/assets/images"
cd "$OUTDIR"

# Function: search Unsplash, extract photo IDs, download best one
download_unsplash() {
  local search_term="$1"
  local outfile="$2"
  
  echo "=== Searching for: $search_term -> $outfile ==="
  
  # URL-encode the search term
  local encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$search_term'))")
  local url="https://unsplash.com/s/photos/${encoded}?orientation=landscape"
  
  # Fetch search page and extract photo IDs from image URLs
  local html
  html=$(curl -sL --max-time 20 "$url" 2>/dev/null) || { echo "  FAILED to fetch search page"; return 1; }
  
  # Extract unique photo IDs from images.unsplash.com and plus.unsplash.com
  local ids
  ids=$(echo "$html" | grep -oE 'photo-[0-9a-zA-Z_-]{6,}|premium_photo-[0-9a-zA-Z_-]{6,}' | sed 's/photo-//;s/premium_photo-//' | sort -u | head -30)
  
  if [ -z "$ids" ]; then
    echo "  No photo IDs found for $search_term"
    return 1
  fi
  
  local count=$(echo "$ids" | wc -l | tr -d ' ')
  echo "  Found $count candidate photos, trying them..."
  
  # Try each photo ID until we get one under 500KB
  local downloaded=0
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    # Skip IDs that look like non-standard (too short)
    [ ${#pid} -lt 8 ] && continue
    
    local dl_url="https://images.unsplash.com/photo-${pid}?w=800&q=80"
    echo "  Trying: $pid ..."
    
    # Download with size limit check
    local tmpfile="${outfile}.tmp"
    if curl -sL --max-time 30 -o "$tmpfile" "$dl_url" 2>/dev/null; then
      local size=$(stat -f%z "$tmpfile" 2>/dev/null || echo 0)
      if [ "$size" -gt 1000 ] && [ "$size" -lt 500000 ]; then
        mv "$tmpfile" "$outfile"
        echo "  SUCCESS: $outfile (${size} bytes, id=$pid)"
        downloaded=1
        break
      elif [ "$size" -ge 500000 ]; then
        echo "  Too large: ${size} bytes, skipping"
        rm -f "$tmpfile"
      else
        echo "  Too small: ${size} bytes, skipping"
        rm -f "$tmpfile"
      fi
    fi
  done <<< "$ids"
  
  if [ "$downloaded" -eq 0 ]; then
    echo "  FAILED to download suitable photo for $outfile"
    return 1
  fi
}

# Also try premium_photo URLs
download_unsplash_premium() {
  local search_term="$1"
  local outfile="$2"
  local pid="$3"
  
  echo "=== Premium download for: $outfile (id=$pid) ==="
  local dl_url="https://images.unsplash.com/premium_photo-${pid}?w=800&q=80"
  local tmpfile="${outfile}.tmp"
  
  if curl -sL --max-time 30 -o "$tmpfile" "$dl_url" 2>/dev/null; then
    local size=$(stat -f%z "$tmpfile" 2>/dev/null || echo 0)
    if [ "$size" -gt 1000 ] && [ "$size" -lt 500000 ]; then
      mv "$tmpfile" "$outfile"
      echo "  SUCCESS: $outfile (${size} bytes)"
    else
      echo "  Size issue: ${size} bytes"
      rm -f "$tmpfile"
    fi
  fi
}

# =============================================
# Venue images
# =============================================
download_unsplash "dark moody speakeasy cocktail bar interior warm lighting" "the-old-man.jpg"
download_unsplash "dark jazz bar dim lighting luxurious" "darkside.jpg"
download_unsplash "italian aperitivo bar warm amber lighting" "bar-leone.jpg"
download_unsplash "mezcal bar rustic agave earthy" "coa.jpg"
download_unsplash "rooftop bar city harbour view" "cardinal-point.jpg"
download_unsplash "fine dining lounge elegant hotel bar" "vea-lounge.jpg"
download_unsplash "live music bar whisky neon lights" "honky-tonks.jpg"
download_unsplash "sake bar japanese aesthetic interior" "sake-central.jpg"
download_unsplash "wine bar champagne elegant lounge" "salon-10.jpg"

# =============================================
# Supplier images
# =============================================
download_unsplash "wine shop bottles shelves retail" "watsons-wine.jpg"
download_unsplash "sake bottles japanese spirits display" "sake-central-supplier.jpg"
download_unsplash "bottle shop interior spirits display" "the-bottle-shop.jpg"
download_unsplash "gin bottles botanical display" "ginsanity.jpg"
download_unsplash "craft beer cans display" "craftissimo.jpg"

# =============================================
# Category images
# =============================================
download_unsplash "dark cocktail bar interior moody" "cocktail-bar.jpg"
download_unsplash "wine bar wine glasses dark warm" "wine-bar.jpg"
download_unsplash "luxury hotel lounge bar dark" "hotel-bar.jpg"
# rooftop-bar.jpg already exists
download_unsplash "whisky bar amber drinks dark moody" "whisky-bar.jpg"
download_unsplash "sports bar tv screens dark" "sports-bar.jpg"
download_unsplash "speakeasy hidden bar moody dark" "speakeasy.jpg"
download_unsplash "craft beer taps dark bar" "craft-beer.jpg"
download_unsplash "champagne glasses bubbles dark" "champagne.jpg"
download_unsplash "sake bottles cups japanese" "sake.jpg"
download_unsplash "nightclub lights dark interior" "nightclub.jpg"
download_unsplash "beach bar seaside evening" "beach-bar.jpg"
download_unsplash "natural wine bottles organic" "natural-wine.jpg"
download_unsplash "gin tonic botanicals bar dark" "gin-bar.jpg"

echo ""
echo "=== ALL DONE ==="
echo "Files in directory:"
ls -la "$OUTDIR"/*.jpg 2>/dev/null | awk '{print $5, $NF}'
