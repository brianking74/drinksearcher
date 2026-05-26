with open('assets/js/app.js') as f:
    content = f.read()

old_handler = """  $('#lead-form').addEventListener('submit', e => {
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
    leadNotice.innerHTML = `<div class=\"notice\">Thanks — your enquiry for <strong>${lead.businessName}</strong> has been received. ${user ? 'You can review it in your account dashboard.' : 'Create or sign into an account later to connect submissions to a profile.'}</div>`;
    if (user) setTimeout(() => { window.location.href = 'account.html'; }, 450);
    else e.currentTarget.reset();
  });"""

new_handler = """  $('#lead-form').addEventListener('submit', function(e) {
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
      source: source
    };
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
      leadNotice.innerHTML = '<div class=\"notice\">Your <strong>' + formData.businessName + '</strong> listing has been added to your account and is now visible in the directory.</div>';
      setTimeout(function() { window.location.href = 'dashboard.html'; }, 2000);
      return;
    }
    var password = 'welcome' + Math.floor(1000 + Math.random() * 9000);
    var signUpResult = storage.signUp({
      name: formData.contactName,
      email: formData.email,
      password: password,
      role: formData.listingType === 'venue' ? 'venue' : 'merchant',
      city: formData.district
    });
    if (!signUpResult.ok) {
      leadNotice.innerHTML = '<div class=\"notice\">' + signUpResult.message + '</div>';
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
    leadNotice.innerHTML = '<div class=\"notice\">Welcome to drinksearcher.hk!<br><br>' +
      'Your <strong>' + formData.businessName + '</strong> listing has been created and is now visible in the directory.' +
      '<br><br><strong>Sign-in details:</strong><br>' +
      'Email: ' + formData.email + '<br>' +
      'Password: ' + password +
      '<br><br>Redirecting to your dashboard...</div>';
    setTimeout(function() { window.location.href = 'dashboard.html'; }, 2500);
    storage.clearPostAuthRedirect();
  });"""

count = content.count(old_handler)
print(f"Found {count} occurrence(s) of old handler")
if count >= 1:
    content = content.replace(old_handler, new_handler)
    with open('assets/js/app.js', 'w') as f:
        f.write(content)
    print("Replacement done")
else:
    print("No match - searching for partial match...")
    # Try to find what's different
    idx1 = content.find("$('#lead-form').addEventListener")
    if idx1 >= 0:
        idx2 = content.find("});", idx1)
        if idx2 >= 0:
            snippet = content[idx1:idx2+3]
            print(f"Found at byte {idx1}, length {len(snippet)}")
            print(f"First 200 chars match: {snippet[:200] == old_handler[:200]}")
            print(f"Last 200 chars match: {snippet[-200:] == old_handler[-200:]}")
            # Check exact bytes
            for i, (a, b) in enumerate(zip(old_handler, snippet)):
                if a != b:
                    print(f"First difference at char {i}: '{a}' vs '{b}' (ord {ord(a)} vs {ord(b)})")
                    print(f"Context: ...{old_handler[max(0,i-20):i+20]}...")
                    print(f"       : ...{snippet[max(0,i-20):i+20]}...")
                    break
            if len(old_handler) != len(snippet):
                print(f"Length mismatch: old={len(old_handler)}, snippet={len(snippet)}")

print("\nNow checking node syntax...")
import subprocess
result = subprocess.run(["node", "--check", "assets/js/app.js"], capture_output=True, text=True, timeout=10)
if result.returncode == 0:
    print("SYNTAX OK")
else:
    print("SYNTAX ERROR:", result.stderr)
