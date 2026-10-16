/**
 * dashboard-cloudinary.js — business dashboard image upload (logo + header).
 *   - 'logo'   -> square profile image / logo   (suppliers.image / venues.image)
 *   - 'header' -> wide header/banner image       (suppliers.hero_image / venues.hero_image)
 * Both are persisted via the save_business_profile RPC.
 *
 * Uploads go through the upload-image Edge Function (signed Cloudinary
 * upload, server-side; requires a signed-in business account). The old
 * Cloudinary unsigned-preset widget was retired — the open preset let
 * anyone store images on the account.
 */
(function () {
  'use strict';
  if (document.body.dataset.page !== 'dashboard') return;

  // slot: 'logo' | 'header'
  function showPreview(slot, url) {
    const inputId = slot === 'header' ? 'dashboard-header-input' : 'dashboard-logo-input';
    const previewId = slot === 'header' ? 'dashboard-header-preview' : 'dashboard-logo-preview';
    const removeId = slot === 'header' ? 'dashboard-remove-header' : 'dashboard-remove-image';
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const removeBtn = document.getElementById(removeId);
    if (input) input.value = url || '';
    if (preview) {
      if (url) { preview.src = url; preview.style.display = ''; }
      else { preview.removeAttribute('src'); preview.style.display = 'none'; }
    }
    if (removeBtn) removeBtn.style.display = url ? '' : 'none';
  }

  window.dsDashboardImageUpload = async function (role, slot) {
    slot = slot || 'logo';
    // File-picker + direct POST to the signed edge function.
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp';
    fileInput.style.display = 'none';
    fileInput.onchange = async () => {
      const file = fileInput.files && fileInput.files[0];
      if (fileInput.parentNode) fileInput.parentNode.removeChild(fileInput);
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB).'); return; }
      try {
        const dataUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const session = await sb.auth.getSession();
        const token = session && session.data && session.data.session ? session.data.session.access_token : '';
        if (!token) { alert('Please sign in again to upload images.'); return; }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            slot: role === 'venue' ? 'venues' : 'suppliers',
            sub: slot === 'header' ? 'headers' : 'logos',
            file: dataUri
          })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) { alert((body && body.error) || 'Upload failed. Please try again.'); return; }
        showPreview(slot, body.url);
      } catch (e) {
        alert('Upload failed: ' + (e && e.message ? e.message : 'please try again.'));
      }
    };
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  window.dsDashboardImageRemove = function (slot) {
    showPreview(slot || 'logo', '');
  };
})();
