#!/usr/bin/env python3
"""Add productManagerSaveOrigin function to app.js."""
with open('assets/js/app.js', 'r') as f:
    c = f.read()

func = '''

async function productManagerSaveOrigin(id, index) {
  const origin = prompt('Enter country/region of origin (e.g. Japan, Mexico, Scotland):');
  if (!origin) return;
  const notice = $('#admin-pm-notice');
  try {
    const { error } = await sb.from('drinks').update({ origin }).eq('id', id);
    if (error) throw error;
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894;">Origin saved: ' + origin + '.</div>';
  } catch (e) {
    if (notice) notice.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">Failed: ' + e.message + '</div>';
  }
}
'''

# Insert before productManagerSaveImage
c = c.replace(
    'async function productManagerSaveImage',
    func.strip() + '\n\nasync function productManagerSaveImage'
)

with open('assets/js/app.js', 'w') as f:
    f.write(c)

# Verify
import re
matches = re.findall(r'async function productManager\w+', c)
print('Functions found:', matches)
