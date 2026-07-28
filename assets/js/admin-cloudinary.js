/**
 * admin-cloudinary.js
 * Adds Cloudinary upload widget buttons to the admin image URL fields.
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
      maxFileSize: 10000000, // 10MB
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
        // Find the currently focused input or the nearest empty image URL field
        const active = document.activeElement;
        let field = null;
        if (active && active.id && (active.id.includes('-img-') || active.placeholder === 'Image URL')) {
          field = active;
        }
        if (!field) {
          // Pick the first empty image URL field
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

// Run on load and re-run when admin re-renders
addButtons();
const observer = new MutationObserver(() => addButtons());
observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

})();
