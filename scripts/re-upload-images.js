#!/usr/bin/env node
/**
 * Re-upload drink product images to Cloudinary.
 * Run: node scripts/re-upload-images.js
 */
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

cloudinary.config({
  cloud_name: 'rqokncht',
  api_key: '334967548599656',
  api_secret: 'UW7cc0UuH3RZOBjcEdXfzQFc82I'
});

const imgDir = path.join(__dirname, '..', 'assets', 'images', 'products');
const files = fs.readdirSync(imgDir).filter(f => /\.webp$/i.test(f));

if (files.length === 0) {
  console.log('No .webp files found in assets/images/products/');
  process.exit(0);
}

console.log(`Uploading ${files.length} images...`);

Promise.all(files.map(file => {
  const filePath = path.join(imgDir, file);
  const publicId = path.parse(file).name;
  return cloudinary.uploader.upload(filePath, {
    folder: 'drinks',
    public_id: publicId,
    overwrite: true,
  }).then(result => {
    console.log(`  ✓ ${file} → ${result.secure_url}`);
    return result;
  }).catch(err => {
    console.log(`  ✗ ${file}: ${err.message}`);
    return null;
  });
})).then(results => {
  const ok = results.filter(Boolean);
  console.log(`\nUploaded: ${ok.length}/${files.length}`);
  console.log('\nUpdate data.js with these URLs:');
  ok.forEach(r => {
    console.log(`  ${r.public_id}.webp → ${r.secure_url}`);
  });
});
