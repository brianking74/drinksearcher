/**
 * admin-guides.js
 * Guide editor for the admin panel — create, edit, delete guides.
 * Loaded only on the admin page.
 */
(function() {
'use strict';

if (document.body.dataset.page !== 'admin') return;

// Only set up if section exists
function initGuideEditor() {
  const section = document.getElementById('admin-guides');
  if (!section) return;
  if (section.dataset.guidesLoaded) return;
  section.dataset.guidesLoaded = 'true';
  loadGuidesList();
}

function showNotice(msg, type) {
  const el = document.getElementById('admin-guides-notice');
  if (!el) return;
  const bg = type === 'success' ? 'rgba(135,168,148,.11);border-color:rgba(135,168,148,.2);color:#87a894'
    : 'rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2';
  el.innerHTML = '<div class="notice" style="background:' + bg + '">' + msg + '</div>';
}

async function loadGuidesList() {
  const container = document.getElementById('admin-guides-list');
  if (!container) return;
  container.innerHTML = '<div class="muted">Loading guides...</div>';
  try {
    const { data: guides, error } = await sb.from('guides').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!guides || !guides.length) {
      container.innerHTML = '<div class="notice">No guides yet. Create your first one.</div>';
      return;
    }
    container.innerHTML = guides.map(g => `
      <div class="admin-table-row" style="grid-template-columns:2fr 120px 80px 1fr;align-items:center;">
        <div><strong>${g.title}</strong><div class="muted" style="font-size:.78rem;">${g.slug}</div></div>
        <div><span class="badge ${g.published ? 'gold' : ''}">${g.published ? 'Published' : 'Draft'}</span></div>
        <div style="text-align:center;">${(g.entries || []).length}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-small" style="font-size:.7rem;padding:2px 8px;" onclick="adminGuides.editGuide('${g.id}')">Edit</button>
          <button class="btn btn-small" style="font-size:.7rem;padding:2px 8px;" onclick="adminGuides.togglePublish('${g.id}')">${g.published ? 'Unpublish' : 'Publish'}</button>
          <button class="btn btn-small" style="font-size:.7rem;padding:2px 8px;color:#ff6b9d;" onclick="adminGuides.deleteGuide('${g.id}','${g.title.replace(/'/g,"\\'")}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="notice" style="background:rgba(255,46,126,.08);border-color:rgba(255,46,126,.18);color:#ffd0e2;">' + e.message + '</div>';
  }
}

function showGuideForm() {
  const container = document.getElementById('admin-guides-list');
  const form = document.getElementById('admin-guides-form');
  if (!container || !form) return;
  container.style.display = 'none';
  form.style.display = 'block';
  // Populate empty form
  document.getElementById('guide-form-title').value = '';
  document.getElementById('guide-form-slug').value = '';
  document.getElementById('guide-form-excerpt').value = '';
  document.getElementById('guide-form-topic').value = 'Night out';
  document.getElementById('guide-form-cover').value = '';
  form.dataset.editId = '';
  renderEntries([]);
}

async function editGuide(id) {
  try {
    const { data, error } = await sb.from('guides').select('*').eq('id', id).single();
    if (error || !data) throw error || new Error('Guide not found');
    const container = document.getElementById('admin-guides-list');
    const form = document.getElementById('admin-guides-form');
    if (!container || !form) return;
    container.style.display = 'none';
    form.style.display = 'block';
    document.getElementById('guide-form-title').value = data.title || '';
    document.getElementById('guide-form-slug').value = data.slug || '';
    document.getElementById('guide-form-excerpt').value = data.excerpt || '';
    document.getElementById('guide-form-topic').value = data.topic || 'Night out';
    document.getElementById('guide-form-cover').value = data.cover_image || '';
    form.dataset.editId = id;
    renderEntries(data.entries || []);
  } catch (e) {
    showNotice('Could not load guide: ' + e.message, 'error');
  }
}

async function togglePublish(id) {
  try {
    const { data, error } = await sb.from('guides').select('published').eq('id', id).single();
    if (error) throw error;
    const { error: updateError } = await sb.from('guides').update({ published: !data.published }).eq('id', id);
    if (updateError) throw updateError;
    showNotice('Guide ' + (data.published ? 'unpublished' : 'published'), 'success');
    loadGuidesList();
  } catch (e) {
    showNotice('Failed: ' + e.message, 'error');
  }
}

async function deleteGuide(id, title) {
  if (!confirm('Delete "' + title + '" permanently?')) return;
  try {
    const { error } = await sb.from('guides').delete().eq('id', id);
    if (error) throw error;
    showNotice('Guide deleted.', 'success');
    loadGuidesList();
  } catch (e) {
    showNotice('Delete failed: ' + e.message, 'error');
  }
}

function cancelForm() {
  document.getElementById('admin-guides-list').style.display = '';
  document.getElementById('admin-guides-form').style.display = 'none';
}

function renderEntries(entries) {
  const list = document.getElementById('guide-entries-list');
  if (!list) return;
  if (!entries || !entries.length) {
    list.innerHTML = '<div class="notice" style="margin-bottom:12px;">No entries yet. Add your first venue.</div>';
    return;
  }
  list.innerHTML = entries.map(function(e, i) { return `
    <div class="admin-guide-entry" style="border:1px solid var(--border);padding:14px;border-radius:6px;margin-bottom:10px;" data-entry-index="${i}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:.9rem;">${i + 1}. ${e.name || 'New entry'}</strong>
        <div>
          <button class="btn btn-small" style="font-size:.65rem;padding:2px 6px;" onclick="adminGuides.moveEntry(${i}, -1)">▲</button>
          <button class="btn btn-small" style="font-size:.65rem;padding:2px 6px;" onclick="adminGuides.moveEntry(${i}, 1)">▼</button>
          <button class="btn btn-small" style="font-size:.65rem;padding:2px 6px;color:#ff6b9d;" onclick="adminGuides.removeEntry(${i})">✕</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <input class="input" placeholder="Venue name" value="${e.name || ''}" onchange="adminGuides.updateEntry(${i},'name',this.value)" style="font-size:.78rem;">
        <input class="input" placeholder="Area (e.g. Central)" value="${e.area || ''}" onchange="adminGuides.updateEntry(${i},'area',this.value)" style="font-size:.78rem;">
        <input class="input" placeholder="Venue slug (for link)" value="${e.venue_slug || ''}" onchange="adminGuides.updateEntry(${i},'venue_slug',this.value)" style="font-size:.78rem;">
        <input class="input" placeholder="Image URL" value="${e.image || ''}" onchange="adminGuides.updateEntry(${i},'image',this.value)" style="font-size:.78rem;">
        <input class="input" placeholder="Rating (e.g. 4.5)" value="${e.rating || ''}" onchange="adminGuides.updateEntry(${i},'rating',this.value)" style="font-size:.78rem;">
        <input class="input" placeholder="Price (e.g. $$$)" value="${e.price || ''}" onchange="adminGuides.updateEntry(${i},'price',this.value)" style="font-size:.78rem;">
      </div>
      <input class="input" placeholder="Cuisine/type tags (e.g. Cocktail Bar · Rooftop)" value="${e.cuisine || ''}" onchange="adminGuides.updateEntry(${i},'cuisine',this.value)" style="font-size:.78rem;width:100%;margin-top:8px;">
      <textarea class="input" placeholder="Description" rows="3" onchange="adminGuides.updateEntry(${i},'description',this.value)" style="font-size:.78rem;width:100%;margin-top:8px;">${e.description || ''}</textarea>
    </div>
  `}).join('');
}

function addEntry() {
  const entries = window._guideEntries || [];
  entries.push({ name: '', area: '', venue_slug: '', image: '', rating: '', price: '', cuisine: '', description: '' });
  window._guideEntries = entries;
  renderEntries(entries);
}

function updateEntry(index, field, value) {
  const entries = window._guideEntries || [];
  if (!entries[index]) return;
  entries[index][field] = String(value).replace(/"/g, '&quot;');
  window._guideEntries = entries;
}

function removeEntry(index) {
  const entries = window._guideEntries || [];
  entries.splice(index, 1);
  window._guideEntries = entries;
  renderEntries(entries);
}

function moveEntry(index, direction) {
  const entries = window._guideEntries || [];
  const target = index + direction;
  if (target < 0 || target >= entries.length) return;
  var tmp = entries[index];
  entries[index] = entries[target];
  entries[target] = tmp;
  window._guideEntries = entries;
  renderEntries(entries);
}

async function saveGuide() {
  const form = document.getElementById('admin-guides-form');
  const editId = form.dataset.editId;
  const title = document.getElementById('guide-form-title').value.trim();
  let slug = document.getElementById('guide-form-slug').value.trim();
  const excerpt = document.getElementById('guide-form-excerpt').value.trim();
  const topic = document.getElementById('guide-form-topic').value;
  const cover_image = document.getElementById('guide-form-cover').value.trim();
  const entries = window._guideEntries || [];

  if (!title) { showNotice('Title is required.', 'error'); return; }
  if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) slug = 'guide-' + Date.now();

  const guideData = { title, slug, excerpt, topic, cover_image, entries, updated_at: new Date().toISOString() };
  if (!editId) guideData.published = false;

  try {
    if (editId) {
      const { error } = await sb.from('guides').update(guideData).eq('id', editId);
      if (error) throw error;
      showNotice('Guide updated.', 'success');
    } else {
      guideData.created_at = new Date().toISOString();
      const { error } = await sb.from('guides').insert(guideData);
      if (error) throw error;
      showNotice('Guide created.', 'success');
    }
    cancelForm();
    loadGuidesList();
  } catch (e) {
    showNotice('Save failed: ' + e.message, 'error');
  }
}

// Auto-slug from title
document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'guide-form-title') {
    const slugField = document.getElementById('guide-form-slug');
    if (slugField && !slugField.value) {
      slugField.value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
  }
});

// Expose methods globally
window.adminGuides = {
  loadGuidesList: loadGuidesList,
  showGuideForm: showGuideForm,
  editGuide: editGuide,
  togglePublish: togglePublish,
  deleteGuide: deleteGuide,
  cancelForm: cancelForm,
  addEntry: addEntry,
  updateEntry: updateEntry,
  removeEntry: removeEntry,
  moveEntry: moveEntry,
  saveGuide: saveGuide,
  renderEntries: renderEntries
};

// Hook into admin page load — wait for section to appear
var observer = new MutationObserver(function() {
  if (document.getElementById('admin-guides')) {
    initGuideEditor();
  }
});
observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });

})();
