/**
 * admin-cloudinary.js
 * Adds Cloudinary upload widget buttons and origin tagging to the admin.
 * Loaded only on the admin page. Uses unsigned upload preset.
 */
(function() {
'use strict';

if (document.body.dataset.page !== 'admin') return;

const CLOUD_NAME = 'rqokncht';
const UPLOAD_PRESET = 'drinksearcher';
const FOLDER = 'drinks';

let widget = null;

function initWidget() {
  if (widget) return widget;
  if (typeof cloudinary === 'undefined') return null;
  widget = cloudinary.createUploadWidget(
    {
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      folder: FOLDER,
      sources: ['local', 'url', 'camera'],
      multiple: false,
      maxFiles: 1,
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      maxFileSize: 10000000,
      styles: {
        palette: {
          window: '#090a0b',
          windowBorder: '#292d2f',
          tabIcon: '#c8aa6e',
          menuIcons: '#f4f0e7',
          textDark: '#111315',
          textLight: '#f4f0e7',
          link: '#c8aa6e',
          action: '#c8aa6e',
          inactiveTabIcon: '#a6a39c',
          error: '#ff5f56',
          inProgress: '#c8aa6e',
          complete: '#87a894',
          sourceBg: '#111315',
          video: '#c8aa6e',
        }
      }
    },
    function(error, result) {
      if (error) return;
      if (result.event === 'success') {
        const url = result.info.secure_url;
        const active = document.activeElement;
        let field = null;
        if (active && active.id && (active.id.includes('-img-') || active.placeholder === 'Image URL')) {
          field = active;
        }
        if (!field) {
          field = document.querySelector('input[placeholder="Image URL"]:not([value])') ||
                  document.querySelector('input[id$="-img-"]:not([value])');
        }
        if (field) {
          field.value = url;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  );
  return widget;
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
      const w = initWidget();
      if (w) w.open();
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
