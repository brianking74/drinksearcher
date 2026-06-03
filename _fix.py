#!/usr/bin/env python3
"""Add admin delete methods as standalone functions + delegated handler"""
import subprocess

with open("/Users/brianking/drinksearcher-repo/assets/js/app.js", "r") as f:
    c = f.read()

# =========================================================
# 1. Delete buttons in templates (simple text replacements)
# =========================================================
c = c.replace("data-create-subscription=\"' + index + '\">Sub</button></td>",
    "data-create-subscription=\"' + index + '\">Sub</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"applications\" data-admin-id=\"' + entry.id + '\">Delete</button></td>")
c = c.replace("data-sub-save=\"' + index + '\">Save</button></div></div>",
    "data-sub-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"subscriptions\" data-admin-id=\"' + sub.id + '\">Delete</button></div></div>")
c = c.replace("data-placement-save=\"' + index + '\">Save</button></td>",
    "data-placement-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"placements\" data-admin-id=\"' + pl.id + '\">Delete</button></td>")
c = c.replace("data-moderation-save=\"' + index + '\">Save</button></div></div>",
    "data-moderation-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"moderation\" data-admin-id=\"' + item.id + '\">Delete</button></div></div>")
c = c.replace("data-import-save=\"' + index + '\">Save</button></td>",
    "data-import-save=\"' + index + '\">Save</button> <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-admin-delete=\"importJobs\" data-admin-id=\"' + job.id + '\">Delete</button></td>")

# =========================================================
# 2. Add standalone helper functions BEFORE all other code
# (at the top of app.js, after the storage object definition)
# =========================================================
# Find the end of the storage object - look for "};" after methods
# Find the last "};" that closes the storage object
storage_close = c.find("};\n\nfunction $")
insert_pos = c.find("\n", storage_close) + 1

helper_functions = """
// Admin helper functions (standalone, not in storage object)
function adminDeleteItem(stateKey, itemId) {
  var state = JSON.parse(localStorage.getItem('ds_admin_state') || 'null');
  if (!state || !state[stateKey]) return;
  state[stateKey] = state[stateKey].filter(function(item) { return item.id !== itemId; });
  localStorage.setItem('ds_admin_state', JSON.stringify(state));
}
function adminDeleteInventoryItem(subId, itemId) {
  var state = JSON.parse(localStorage.getItem('ds_admin_state') || 'null');
  if (!state || !state.inventorySubmissions) return;
  state.inventorySubmissions.forEach(function(sub) {
    if (sub.id === subId) {
      sub.items = (sub.items || []).filter(function(item) { return item._id !== itemId; });
      sub.itemCount = sub.items.length;
    }
  });
  localStorage.setItem('ds_admin_state', JSON.stringify(state));
}
function adminApproveInventoryItem(subId, itemId) {
  var state = JSON.parse(localStorage.getItem('ds_admin_state') || 'null');
  if (!state || !state.inventorySubmissions) return;
  state.inventorySubmissions.forEach(function(sub) {
    (sub.items || []).forEach(function(item) {
      if (item._id === itemId) { item._status = 'Approved'; }
    });
  });
  localStorage.setItem('ds_admin_state', JSON.stringify(state));
}
function adminRejectInventoryItem(subId, itemId) {
  var state = JSON.parse(localStorage.getItem('ds_admin_state') || 'null');
  if (!state || !state.inventorySubmissions) return;
  state.inventorySubmissions.forEach(function(sub) {
    (sub.items || []).forEach(function(item) {
      if (item._id === itemId) { item._status = 'Rejected'; }
    });
  });
  localStorage.setItem('ds_admin_state', JSON.stringify(state));
}
"""
c = c[:insert_pos] + helper_functions + c[insert_pos:]

# =========================================================
# 3. Add delegated click handler at the DOMContentLoaded level
# =========================================================
# Find the end of DOMContentLoaded
dcl_end = c.rfind("});")
# Add before it
click_handler = """
  // Admin page click handler
  document.body.addEventListener('click', function(e) {
    if (document.body.dataset.page !== 'admin') return;
    var btn = e.target.closest('[data-item-approve]');
    if (btn) {
      var sep = btn.dataset.itemApprove.indexOf('_item_');
      if (sep > 0) { adminApproveInventoryItem(btn.dataset.itemApprove.slice(0, sep), btn.dataset.itemApprove.slice(sep + 1)); renderAdminDashboardPage(); }
      return;
    }
    btn = e.target.closest('[data-item-reject]');
    if (btn) {
      var sep = btn.dataset.itemReject.indexOf('_item_');
      if (sep > 0) { adminRejectInventoryItem(btn.dataset.itemReject.slice(0, sep), btn.dataset.itemReject.slice(sep + 1)); renderAdminDashboardPage(); }
      return;
    }
    btn = e.target.closest('[data-item-delete]');
    if (btn) {
      var sep = btn.dataset.itemDelete.indexOf('_item_');
      if (sep > 0) { adminDeleteInventoryItem(btn.dataset.itemDelete.slice(0, sep), btn.dataset.itemDelete.slice(sep + 1)); renderAdminDashboardPage(); }
      return;
    }
    btn = e.target.closest('[data-admin-delete]');
    if (btn) {
      var stateKey = btn.dataset.adminDelete;
      adminDeleteItem(stateKey, btn.dataset.adminId);
      renderAdminDashboardPage();
      return;
    }
  });
"""

c = c[:dcl_end] + click_handler + c[dcl_end:]

with open("/Users/brianking/drinksearcher-repo/assets/js/app.js", "w") as f:
    f.write(c)

r = subprocess.run(["node", "--check", "assets/js/app.js"], capture_output=True, text=True,
    cwd="/Users/brianking/drinksearcher-repo")
if r.returncode == 0:
    print("JS syntax: OK!")
else:
    print(f"ERROR: {r.stderr[:200]}")
