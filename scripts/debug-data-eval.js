#!/usr/bin/env node
/** Debug why data.js sandbox eval yields nothing. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'data.js'), 'utf8');
console.log('src length:', src.length);

const sandbox = { console };
vm.createContext(sandbox);
try {
  vm.runInContext(src, sandbox);
  console.log('full eval OK');
} catch (e) {
  console.log('full eval FAILED:', e.message);
}
console.log('keys:', Object.keys(sandbox).filter(k => k !== 'console'));
console.log('drinksInventory type:', typeof sandbox.drinksInventory, Array.isArray(sandbox.drinksInventory) ? sandbox.drinksInventory.length : '');
