#!/usr/bin/env python3
"""One clean pass: add all admin delete/approve/reject handlers"""
import subprocess

with open("/Users/brianking/drinksearcher-repo/assets/js/app.js", "r") as f:
    c = f.read()

# =========================================================
# 1. Storage: add deleteAdminItem and syncInventorySubmission
#    AFTER the last method in the storage object
# =========================================================
# Find the storage object closing
storage_end = c.find("},\n  seedDemoAccount")
# Insert new methods before the comma before seedDemoAccount
new_methods = """
  deleteAdminItem(stateKey, itemId) {
    const state = this.getAdminState();
    if (!state[stateKey]) return;
    state[stateKey] = state[stateKey].filter(function(item) { return item.id !== itemId; });
    localStorage.setItem('ds_admin_state', JSON.stringify(state));
  },
  syncInventorySubmission(email, items) {
    const submissions = this.getInventorySubmissions();
    var match = null;
    submissions.forEach(function(sub) {
      if (sub.email === email && sub.status === 'Pending') match = sub;
    });
    if (match) {
      var oldItems = match.items || [];
      match.items = items.map(function(newItem, idx) {
        var oldItem = oldItems.find(function(o) { return o._id === newItem._id || o.name === newItem.name; });
        return Object.assign({}, newItem, { _id: newItem._id || 'item_' + Date.now() + '_' + idx, _status: oldItem ? oldItem._status : 'Pending' });
      });
      match.itemCount = items.length;
      const state = this.getAdminState();
      state.inventorySubmissions = submissions;
      localStorage.setItem('ds_admin_state', JSON.stringify(state));
      return true;
    }
    return false;
  },"""

c = c[:storage_end] + new_methods + c[storage_end:]

# =========================================================
# 2. Template: Add Delete buttons to all admin sections
# =========================================================
c = c.replace(
    "data-create-subscription=\"' + index + '\">Sub</button></td>",
    "data-create-subscription=\"' + index + '\">Sub</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"applications\" data-admin-id=\"' + entry.id + '\">Delete</button></td>"
)
c = c.replace(
    "data-sub-save=\"' + index + '\">Save</button></div></div>",
    "data-sub-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"subscriptions\" data-admin-id=\"' + sub.id + '\">Delete</button></div></div>"
)
c = c.replace(
    "data-placement-save=\"' + index + '\">Save</button></td>",
    "data-placement-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"placements\" data-admin-id=\"' + pl.id + '\">Delete</button></td>"
)
c = c.replace(
    "data-moderation-save=\"' + index + '\">Save</button></div></div>",
    "data-moderation-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"moderation\" data-admin-id=\"' + item.id + '\">Delete</button></div></div>"
)
c = c.replace(
    "data-import-save=\"' + index + '\">Save</button></td>",
    "data-import-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"importJobs\" data-admin-id=\"' + job.id + '\">Delete</button></td>"
)

# =========================================================
# 3. Auto-sync on saveItems in merchant dashboard
# =========================================================
c = c.replace(
    "persist();\n      // Auto-sync to admin inventory submission\n      if (user && user.email) {\n        storage.syncInventorySubmission(user.email, config.items);\n        // Show toast notification\n        var toast = document.createElement('div');\n        toast.className = 'toast-notification';\n        toast.textContent = 'Items saved and synced to admin review.';\n        document.body.appendChild(toast);\n        setTimeout(function() { toast.classList.add('toast-fade'); }, 2000);\n        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);\n      }",
    ""
)

# Find the saveItems function and add auto-sync
old_save_end = "persist();\n      if (user && user.email) {\n        storage.syncInventorySubmission(user.email, config.items);\n        var toast = document.createElement('div');\n        toast.className = 'toast-notification';\n        toast.textContent = 'Items saved and synced to admin review.';\n        document.body.appendChild(toast);\n        setTimeout(function() { toast.classList.add('toast-fade'); }, 2000);\n        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);\n      }"
# This might not exist yet since we're on a clean base - let's add it fresh
# Find the profileForm submit handler for the sync
idx = c.find("notice.innerHTML = '<div class=\"notice\">Pricing and availability updated.</div>';")
if idx > 0:
    after_notice = c.find(";", idx) + 1
    sync_code = """
      // Auto-sync to admin
      if (user && user.email) storage.syncInventorySubmission(user.email, config.items);"""
    c = c[:after_notice] + sync_code + c[after_notice:]

# =========================================================
# 4. Add event handlers at end of renderAdminDashboardPage
# =========================================================
admin_start = c.find("function renderAdminDashboardPage()")
admin_body = c[c.find("{", admin_start):]

depth = 0
fn_end = 0
for i, ch in enumerate(admin_body):
    if ch == '{': depth += 1
    elif ch == '}': depth -= 1
    if depth == 0:
        fn_end = c.find("{", admin_start) + i + 1
        break

handler_code = """
  // Admin item action handlers
  $$('[data-item-approve]', app).forEach(function(btn) {
    btn.addEventListener('click', function() {
      var fullId = btn.dataset.itemApprove;
      if (!fullId) return;
      var sep = fullId.indexOf('_item_');
      if (sep < 0) return;
      storage.approveInventoryItem(fullId.slice(0, sep), fullId.slice(sep + 1));
      renderAdminDashboardPage();
    });
  });
  $$('[data-item-reject]', app).forEach(function(btn) {
    btn.addEventListener('click', function() {
      var fullId = btn.dataset.itemReject;
      if (!fullId) return;
      var sep = fullId.indexOf('_item_');
      if (sep < 0) return;
      storage.rejectInventoryItem(fullId.slice(0, sep), fullId.slice(sep + 1));
      renderAdminDashboardPage();
    });
  });
  $$('[data-item-delete]', app).forEach(function(btn) {
    btn.addEventListener('click', function() {
      var fullId = btn.dataset.itemDelete;
      if (!fullId) return;
      var sep = fullId.indexOf('_item_');
      if (sep < 0) return;
      storage.deleteInventoryItem(fullId.slice(0, sep), fullId.slice(sep + 1));
      renderAdminDashboardPage();
    });
  });
  $$('[data-admin-delete]', app).forEach(function(btn) {
    btn.addEventListener('click', function() {
      storage.deleteAdminItem(btn.dataset.adminDelete, btn.dataset.adminId);
      renderAdminDashboardPage();
    });
  });
"""

c = c[:fn_end-1] + handler_code + c[fn_end-1:]

with open("/Users/brianking/drinksearcher-repo/assets/js/app.js", "w") as f:
    f.write(c)

r = subprocess.run(["node", "--check", "assets/js/app.js"],
    capture_output=True, text=True, cwd="/Users/brianking/drinksearcher-repo")
if r.returncode == 0:
    print("JS syntax: OK!")
else:
    print(f"ERROR: {r.stderr[:200]}")
