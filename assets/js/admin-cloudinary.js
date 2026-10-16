/**
 * admin-cloudinary.js
 * Adds image-upload buttons and origin tagging to the admin.
 * Loaded only on the admin page. Uploads go through the upload-image Edge
 * Function (signed, server-side; admin slot) — the unsigned preset is no
 * longer used from the browser.
 */
(function() {
'use strict';

if (document.body.dataset.page !== 'admin') return;

const FOLDER = 'drinks';

async function uploadToEdge(file) {
  const dataUri = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const session = await sb.auth.getSession();
  const token = session && session.data && session.data.session ? session.data.session.access_token : '';
  if (!token) throw new Error('Please sign in again.');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ slot: 'drinks', file: dataUri })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body && body.error) || 'Upload failed');
  return body.url;
}

function initWidget() {
  // Legacy entry point: replaced by the per-field file-picker in addButtons().
  return null;
}

// Add upload buttons next to image URL fields
function addButtons() {
  document.querySelectorAll('input[placeholder="Image URL"]').forEach((input) => {
    if (input.parentElement.querySelector('.cld-upload-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-small cld-upload-btn';
    btn.textContent = 'Upload';
    btn.style.cssText = 'margin-left:6px;font-size:.65rem;padding:6px 10px;min-height:32px;flex-shrink:0;';
    btn.onclick = function(e) {
      e.preventDefault();
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif';
      fileInput.style.display = 'none';
      fileInput.onchange = async () => {
        const file = fileInput.files && fileInput.files[0];
        if (fileInput.parentNode) fileInput.parentNode.removeChild(fileInput);
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert('Image too large (max 10MB).'); return; }
        btn.disabled = true;
        btn.textContent = 'Uploading…';
        try {
          const url = await uploadToEdge(file);
          input.value = url;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (err) {
          alert(err.message || 'Upload failed.');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Upload';
        }
      };
      document.body.appendChild(fileInput);
      fileInput.click();
    };
    input.style.cssText = (input.getAttribute('style') || '') + ';flex:1;min-width:0;';
    input.parentElement.style.display = 'flex';
    input.parentElement.style.alignItems = 'center';
    input.parentElement.appendChild(btn);
  });
}

// Add origin button to each product manager row
function addOriginButtons() {
  document.querySelectorAll('#admin-product-manager .admin-table-row').forEach(function(row) {
    if (row.querySelector('.origin-btn')) return;
    var approveBtn = row.querySelector('button[onclick*="productManagerAction"]');
    if (!approveBtn) return;
    var match = approveBtn.getAttribute('onclick').match(/productManagerAction\('([^']+)'/);
    if (!match) return;
    var id = match[1];
    var actions = row.querySelector('div:last-child');
    if (!actions) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-small origin-btn';
    btn.textContent = 'Origin';
    btn.style.cssText = 'font-size:.7rem;padding:2px 8px;color:#87a894;';
    btn.onclick = async function() {
      if (typeof sb === 'undefined') { alert('Supabase not available'); return; }
      var origin = prompt('Enter country/region of origin (e.g. Japan, Mexico, Scotland):');
      if (!origin) return;
      try {
        var result = await sb.from('drinks').update({ origin: origin }).eq('id', id);
        if (result.error) throw result.error;
        alert('Origin saved: ' + origin);
      } catch (e) {
        alert('Failed: ' + e.message);
      }
    };
    var deleteBtn = actions.querySelector('button:last-child');
    if (deleteBtn) {
      actions.insertBefore(btn, deleteBtn);
    } else {
      actions.appendChild(btn);
    }
  });
}

// Add origin input fields next to image URL inputs
function addOriginFields() {
  document.querySelectorAll('input[placeholder="Image URL"]').forEach(function(input) {
    if (input.parentElement.querySelector('.origin-field')) return;
    var row = input.closest('.admin-table-row');
    if (!row) return;
    var originInput = document.createElement('input');
    originInput.type = 'text';
    originInput.className = 'input origin-field';
    originInput.placeholder = 'Origin';
    originInput.style.cssText = 'font-size:.7rem;width:80px;margin-left:4px;flex-shrink:0;';
    input.parentElement.insertBefore(originInput, input.nextSibling);
  });
}

// Run on load and re-run when admin re-renders
addButtons();
addOriginButtons();
var observer = new MutationObserver(function() { addButtons(); addOriginButtons(); });
observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

})();
