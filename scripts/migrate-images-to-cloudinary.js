#!/usr/bin/env node
/**
 * migrate-images-to-cloudinary.js
 * Upload existing product images from assets/images/products/ to Cloudinary.
 *
 * Usage: node scripts/migrate-images-to-cloudinary.js
 *
 * This script:
 * 1. Scans assets/images/products/ for .webp files
 * 2. Uploads each to Cloudinary in the 'drinks' folder
 * 3. Outputs a mapping of local filename -> cloudinary URL
 * 4. Optionally updates supabase.js to use the new URLs
 *
 * You need a Cloudinary account with API credentials.
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────
const CLOUD_NAME = 'rqokncht';
const API_KEY = '334967548599656';
const API_SECRET = 'UW7cc0UuH3RZOBjcEdXfzQFc82I';
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images', 'products');
const FOLDER = 'drinks';

// ─── Init Cloudinary ─────────────────────────────────────
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

// ─── Scan local images ───────────────────────────────────
const imageFiles = [];
if (fs.existsSync(IMAGES_DIR)) {
  fs.readdirSync(IMAGES_DIR).forEach(file => {
    if (/\.(webp|jpg|jpeg|png|gif)$/i.test(file)) {
      imageFiles.push(file);
    }
  });
}

if (imageFiles.length === 0) {
  console.log('No local product images found in assets/images/products/');
  process.exit(0);
}

console.log(`Found ${imageFiles.length} images to upload...`);

// ─── Upload each image ────────────────────────────────────
const results = [];

async function uploadAll() {
  for (const file of imageFiles) {
    const filePath = path.join(IMAGES_DIR, file);
    const publicId = path.parse(file).name; // e.g. "cincoro-blanco"
    
    try {
      console.log(`  Uploading ${file}...`);
      const result = await cloudinary.uploader.upload(filePath, {
        folder: FOLDER,
        public_id: publicId,
        overwrite: true,
      });
      results.push({ file, url: result.secure_url, publicId: result.public_id });
      console.log(`    ✓ ${result.secure_url}`);
    } catch (err) {
      console.error(`    ✗ ${file}: ${err.message}`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────
  console.log('\n─── Migration Summary ───');
  console.log(`Uploaded: ${results.length}/${imageFiles.length}`);
  console.log('\nURL Mapping (local → Cloudinary):');
  results.forEach(r => console.log(`  ${r.file} → ${r.url}`));

  // ─── Generate data.js snippet ────────────────────────────
  console.log('\n─── Update data.js with these URLs ───');
  results.forEach(r => {
    const drinkName = r.publicId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    console.log(`// ${drinkName}: ${r.url}`);
  });
}

uploadAll().catch(console.error);
