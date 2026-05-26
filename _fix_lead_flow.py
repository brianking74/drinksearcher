with open('assets/js/app.js') as f:
    content = f.read()

# === CHANGE 1: Add getUserListings/setUserListings/addUserListing to storage object ===
# Insert before the closing }; at the storage object (line 295)

new_storage_methods = '''\
  getUserListings() {
    try { return JSON.parse(localStorage.getItem('ds_user_listings') || '[]'); } catch { return []; }
  },
  setUserListings(list) {
    localStorage.setItem('ds_user_listings', JSON.stringify(list));
  },
  addUserListing(data) {
    const list = this.getUserListings();
    const entry = { ...data, id: `listing_${Date.now()}`, submittedAt: new Date().toISOString() };
    list.unshift(entry);
    this.setUserListings(list);
    return entry;
  }
'''

# Find the closing }; of storage object (the last one before the next function)
old_storage_close = '''  }
};

function currentPagePath'''
new_storage_close = f'''  }}
{new_storage_methods}}};

function currentPagePath'''

content = content.replace(old_storage_close, new_storage_close)

# === CHANGE 2: Add mergeUserListings function after storage object ===
old_after_storage = '''function currentPagePath'''
new_after_storage = '''function mergeUserListings() {
  const listings = storage.getUserListings();
  listings.forEach(function(l) {
    if (l.listingType === 'venue') {
      var exists = typeof venueListings !== 'undefined' && venueListings.standard.some(function(v) { return v[0] === l.businessName; });
      if (!exists && typeof venueListings !== 'undefined') venueListings.standard.unshift([l.businessName, l.district || 'TBD', l.phone || '\u2014', 'Venue / Bar']);
    } else {
      var exists = typeof supplierListings !== 'undefined' && supplierListings.standard.some(function(s) { return s[0] === l.businessName; });
      if (!exists && typeof supplierListings !== 'undefined') supplierListings.standard.unshift([l.businessName, l.district || 'TBD', l.phone || '\u2014', 'Supplier / Merchant']);
    }
  });
}

function currentPagePath'''

content = content.replace(old_after_storage, new_after_storage)

# === CHANGE 3: Add mergeUserListings() call in renderVenueDirectory and renderSupplierDirectory ===

# In renderVenueDirectory, add mergeUserListings() after the consts
old_vd = '''function renderVenueDirectory() {
  const app = $('#app');
  const gridContent'''
content = content.replace(old_vd, '''function renderVenueDirectory() {
  mergeUserListings();
  const app = $('#app');
  const gridContent''')

# In renderSupplierDirectory
old_sd = '''function renderSupplierDirectory() {
  const app = $('#app');
  const gridContent'''
content = content.replace(old_sd, '''function renderSupplierDirectory() {
  mergeUserListings();
  const app = $('#app');
  const gridContent''')

# === CHANGE 4: Rewrite the lead form submit handler ===
old_submit = '''  $('#lead-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const lead = storage.addLead({
      accountEmail: user?.email || '',
      listingType: form.get('listingType'),
      businessName: form.get('businessName'),
      contactName: form.get('contactName'),
      email: String(form.get('email') || '').trim().toLowerCase(),
      phone: form.get('phone'),
      district: form.get('district'),
      website: form.get('website'),

      notes: form.get('notes'),
      source
    });
    leadNotice.innerHTML = `<div class="notice">Thanks \\u2014 your enquiry for <strong>${lead.businessName}</strong> has been received. ${user ? 'You can review it in your account dashboard.' : 'Create or sign into an account later to connect submissions to a profile.'}</div>`;
    if (user) setTimeout(() => { window.location.href = 'account.html'; }, 450);
    else e.currentTarget.reset();
  });'''

new_submit = '''  $('#lead-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const formData = {
      listingType: form.get('listingType'),
      businessName: form.get('businessName'),
      contactName: form.get('contactName'),
      email: String(form.get('email') || '').trim().toLowerCase(),
      phone: form.get('phone'),
      district: form.get('district'),
      website: form.get('website'),
      notes: form.get('notes'),
      source: '\\'' + source + '\\''
    };
    // Already signed in \\u2014 add listing to their account
    if (user) {
      storage.addUserListing(formData);
      if (typeof storage.updateDashboardState === 'function') {
        storage.updateDashboardState(user.email, {
          businessName: formData.businessName,
          contactEmail: formData.email,
          phone: formData.phone,
          district: formData.district
        });
      }
      leadNotice.innerHTML = '<div class=\\"notice\\">Your <strong>' + formData.businessName + '</strong> listing has been added to your account and is now visible in the directory.</div>';
      setTimeout(function() { window.location.href = 'dashboard.html'; }, 2000);
      return;
    }
    // Not signed in \\u2014 create account + add listing + sign in
    var password = 'welcome' + Math.floor(1000 + Math.random() * 9000);
    var signUpResult = storage.signUp({
      name: formData.contactName,
      email: formData.email,
      password: password,
      role: formData.listingType === 'venue' ? 'venue' : 'merchant',
      city: formData.district
    });
    if (!signUpResult.ok) {
      leadNotice.innerHTML = '<div class=\\"notice\\">' + signUpResult.message + '</div>';
      return;
    }
    storage.addUserListing(formData);
    if (typeof storage.updateDashboardState === 'function') {
      storage.updateDashboardState(formData.email, {
        businessName: formData.businessName,
        contactEmail: formData.email,
        phone: formData.phone,
        district: formData.district
      });
    }
    leadNotice.innerHTML = '<div class=\\"notice\\">Welcome to drinksearcher.hk!<br><br>' +
      'Your <strong>' + formData.businessName + '</strong> listing has been created and is now visible in the directory.' +
      '<br><br><strong>Sign-in details:</strong><br>' +
      'Email: ' + formData.email + '<br>' +
      'Password: ' + password +
      '<br><br>Redirecting to your dashboard...</div>';
    setTimeout(function() { window.location.href = 'dashboard.html'; }, 2500);
    storage.clearPostAuthRedirect();
  });'''

content = content.replace(old_submit, new_submit)

with open('assets/js/app.js', 'w') as f:
    f.write(content)

print("All changes applied successfully")
