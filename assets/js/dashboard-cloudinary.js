/**
 * dashboard-cloudinary.js
 * Supplier/venue-facing Cloudinary upload widget for the business dashboard.
 * Provides TWO upload slots on the "Listing controls" form:
 *   - 'logo'   -> square profile image / logo   (suppliers.image / venues.image)
 *   - 'header' -> wide header/banner image      (suppliers.hero_image / venues.hero_image)
 * Both are persisted via the save_business_profile RPC.
 * Uses the same unsigned upload preset as the admin (cloud rqokncht).
 */
(function () {
  'use strict';
  if (document.body.dataset.page !== 'dashboard') return;

  const CLOUD_NAME = 'rqokncht';
  const UPLOAD_PRESET = 'drinksearcher';
  let widget = null;

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

  window.dsDashboardImageUpload = function (role, slot) {
    slot = slot || 'logo';
    if (typeof cloudinary === 'undefined') {
      alert('Image upload is still loading — please try again in a moment.');
      return;
    }
    const folder = role === 'venue' ? 'venues' : 'suppliers';
    widget = cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        folder: slot === 'header' ? folder + '/headers' : folder + '/logos',
        sources: ['local', 'url', 'camera'],
        multiple: false,
        maxFiles: 1,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxFileSize: 5000000,
        ...(slot === 'logo'
          ? { cropping: true, croppingAspectRatio: 1, showSkipCropButton: false, croppingShowDimensions: true }
          : {}),
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
            video: '#c8aa6e'
          }
        }
      },
      function (error, result) {
        if (error) return;
        if (result && result.event === 'success') {
          showPreview(slot, result.info.secure_url);
        }
      }
    );
    widget.open();
  };

  window.dsDashboardImageRemove = function (slot) {
    showPreview(slot || 'logo', '');
  };
})();
