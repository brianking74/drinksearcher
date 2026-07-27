#!/usr/bin/env python3
with open('assets/js/premium.js', 'r') as f:
    text = f.read()

# Profile section: 44877 to 45766 (890 chars)
old_profile = text[44877:45767]
print(f"Old profile: {len(old_profile)} chars, starts: {old_profile[:40]}")

new_profile = '''profile:`<div class="app-head"><div><span class="eyebrow">Account</span><h1>Profile details</h1><p class="lead">Update your contact information.</p></div></div><div style="display:grid;gap:16px;margin-top:24px"><div class="panel"><label class="dashboard-field"><span>Full name</span><input class="input" id="dash-profile-name" value="${safe(user.name||'')}" placeholder="Your full name" /></label><label class="dashboard-field"><span>Preferred district</span><input class="input" id="dash-profile-city" value="${safe(user.city||'')}" placeholder="e.g. Central" /></label><label class="dashboard-field"><span>Email</span><input class="input" value="${safe(user.email||'')}" disabled /></label><button class="btn btn-primary" type="button" onclick="saveDashboardProfile()">Save profile</button><div id="dash-profile-notice"></div></div><div class="panel"><span class="eyebrow">Account</span><h3>Role: ${safe(user.role||'searcher')}</h3><p class="muted">Created ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-HK',{year:'numeric',month:'short',day:'numeric'}) : '\u2014'}</p></div></div>'''

text = text[:44877] + new_profile + text[45767:]

with open('assets/js/premium.js', 'w') as f:
    f.write(text)
print("Profile replaced")
