#!/usr/bin/env python3
"""Clean implementation of admin Approve/Reject/Delete"""
import subprocess

with open("/Users/brianking/drinksearcher-repo/assets/js/app.js", "r") as f:
    c = f.read()

# =========================================================
# 1. Add standalone helper functions at top of file
# =========================================================
# After storage object definition - find "};" that closes storage
storage_end = c.find("};\n\nfunction $")
insert = c.find("\n", storage_end) + 1

helpers = """
function adminGetState() {
  return JSON.parse(localStorage.getItem('ds_admin_state') || 'null');
}
function adminSaveState(state) {
  localStorage.setItem('ds_admin_state', JSON.stringify(state));
}
function adminDeleteItem(stateKey, itemId) {
  var s = adminGetState(); if (!s || !s[stateKey]) return;
  s[stateKey] = s[stateKey].filter(function(i) { return i.id !== itemId; });
  adminSaveState(s);
}
function adminDeleteInventoryItem(subId, itemId) {
  var s = adminGetState(); if (!s || !s.inventorySubmissions) return;
  s.inventorySubmissions.forEach(function(sub) {
    if (sub.id === subId) { sub.items = (sub.items||[]).filter(function(i) { return i._id !== itemId; }); sub.itemCount = sub.items.length; }
  });
  adminSaveState(s);
}
function adminApproveItem(subId, itemId) {
  var s = adminGetState(); if (!s || !s.inventorySubmissions) return;
  s.inventorySubmissions.forEach(function(sub) { (sub.items||[]).forEach(function(i) { if (i._id === itemId) i._status = 'Approved'; }); });
  adminSaveState(s);
}
function adminRejectItem(subId, itemId) {
  var s = adminGetState(); if (!s || !s.inventorySubmissions) return;
  s.inventorySubmissions.forEach(function(sub) { (sub.items||[]).forEach(function(i) { if (i._id === itemId) i._status = 'Rejected'; }); });
  adminSaveState(s);
}
function adminDeleteSubmission(subId) {
  var s = adminGetState(); if (!s || !s.inventorySubmissions) return;
  s.inventorySubmissions = s.inventorySubmissions.filter(function(x) { return x.id !== subId; });
  adminSaveState(s);
}
"""
c = c[:insert] + helpers + c[insert:]

# =========================================================
# 2. Add Delete buttons to admin section templates
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

# Add Delete button to inventory submissions item rows
old_item = "(!isRejected ? '<button class=\"admin-btn admin-btn-sm\" type=\"button\" data-item-reject=\"' + sub.id + '_item_' + i._id + '\">Reject</button>' : '') + '</div></div>'"
new_item = "(!isRejected ? '<button class=\"admin-btn admin-btn-sm\" type=\"button\" data-item-reject=\"' + sub.id + '_item_' + i._id + '\">Reject</button>' : '') + ' <button class=\"admin-btn admin-btn-sm\" style=\"color:#ff5252;\" type=\"button\" data-item-delete=\"' + sub.id + '_item_' + i._id + '\">Delete</button></div></div>'"
if old_item in c:
    c = c.replace(old_item, new_item)

# Add Delete all button to submission card header
old_header = "</div><div class=\"inv-item-table\">"
# Find the one inside the admin template (after the stats div)
idx = c.find(old_header, c.find("admin-inventory-subs"))
if idx > 0:
    # Go back to find the closing </div> of the card-head
    before = c.rfind("</div>", 0, idx)
    if before > 0 and before > idx - 500:
        delete_all = " <button class=\"admin-btn admin-btn-sm\" type=\"button\" data-sub-delete=\\\"' + sub.id + '\\\" style=\"color:#ff5252;margin-left:8px;\">Delete all</button>"
        c = c[:before] + delete_all + c[before:]
        print("Added Delete all button")
else:
    print("Could not find inv-item-table in admin template")

# =========================================================
# 3. Add click handler at DOMContentLoaded level
# =========================================================
# Find the line "if (page === 'admin') renderAdminDashboardPage();"
old_line = "if (page === 'admin') renderAdminDashboardPage();"
new_line = old_line + """
  // Admin button handler
  document.body.addEventListener('click', function __adminClick(e) {
    if (document.body.dataset.page !== 'admin') return;
    var b = e.target.closest('[data-item-approve]'); var s, x;
    if (b) { s = b.dataset.itemApprove; x = s.indexOf('_item_'); if (x > 0) { adminApproveItem(s.slice(0, x), s.slice(x+6)); renderAdminDashboardPage(); } return; }
    b = e.target.closest('[data-item-reject]');
    if (b) { s = b.dataset.itemReject; x = s.indexOf('_item_'); if (x > 0) { adminRejectItem(s.slice(0, x), s.slice(x+6)); renderAdminDashboardPage(); } return; }
    b = e.target.closest('[data-item-delete]');
    if (b) { s = b.dataset.itemDelete; x = s.indexOf('_item_'); if (x > 0) { adminDeleteInventoryItem(s.slice(0, x), s.slice(x+6)); renderAdminDashboardPage(); } return; }
    b = e.target.closest('[data-admin-delete]');
    if (b) { adminDeleteItem(b.dataset.adminDelete, b.dataset.adminId); renderAdminDashboardPage(); return; }
    b = e.target.closest('[data-sub-delete]');
    if (b) { adminDeleteSubmission(b.dataset.subDelete); renderAdminDashboardPage(); return; }
  });"""

if old_line in c:
    c = c.replace(old_line, new_line)
    print("Added click handler after admin render")
else:
    print("Could not find renderAdminDashboardPage call")
    # Search for alternative
    idx = c.find("renderAdminDashboardPage();")
    if idx > 0:
        print(f"Found at byte {idx}")
        print(repr(c[idx-30:idx+60]))

with open("/Users/brianking/drinksearcher-repo/assets/js/app.js", "w") as f:
    f.write(c)

r = subprocess.run(["node", "--check", "assets/js/app.js"],
    capture_output=True, text=True, cwd="/Users/brianking/drinksearcher-repo")
if r.returncode == 0:
    print("JS syntax: OK!")
else:
    print(f"ERROR: {r.stderr[:200]}")
