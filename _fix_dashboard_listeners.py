#!/usr/bin/env python3
"""Fix dead code in renderBusinessDashboardPage: move event listeners after render"""
with open("/Users/brianking/drinksearcher-repo/assets/js/app.js", "r") as f:
    content = f.read()

# =========================================================
# Strategy: 
# 1. Move `const renderRole = (role) => {` + template ONLY (lines 1427-1581)
#    - Keep just the return of the template, remove dead code after it
# 2. Define config, role, addOnRows in the outer scope BEFORE renderRole
# 3. Move event listener code (profileForm, planForm, saveItems, etc.) 
#    to AFTER app.innerHTML = renderRole(...)
# =========================================================

# Find boundaries
fn_start = content.find("function renderBusinessDashboardPage()")
role_def = content.find("const renderRole = (role) => {", fn_start)
ret_stmt = content.find("return `", role_def)
template_end = content.find("`;", ret_stmt) + 2
close_brace = content.find("};", content.find("app.innerHTML = renderRole(", fn_start))
inner_html_line = content.find("app.innerHTML = renderRole(", fn_start)

# Lines for reference
roles = content.split("\n")
role_def_line = content[:role_def].count("\n") + 1
template_end_line = content[:template_end].count("\n") + 1
inner_html_line_num = content[:inner_html_line].count("\n") + 1
close_brace_line = content[:close_brace].count("\n") + 1

print(f"renderRole definition: line {role_def_line}")
print(f"Template ends: line {template_end_line}")  
print(f"Dead code: lines {template_end_line+1}-{close_brace_line-1}")
print(f"app.innerHTML: line {inner_html_line_num}")
print(f"Close brace: line {close_brace_line}")

# Extract the key sections
section_a = content[:role_def]  # Everything before renderRole definition

# The renderRole function header and variables (up to the return)
section_b_header = content[role_def:ret_stmt]  # "const renderRole... return"

# The template itself
section_b_template = content[ret_stmt:template_end]  # "return `...`;"

# The dead code (event listeners after return)
dead_code = content[template_end:close_brace]  # everything between `; and };

# The rest (app.innerHTML = ... and closing)
section_c = content[close_brace:]  # app.innerHTML = ... and }

# Remove the extra line before using it
dead_code_clean = dead_code.strip()

# Show first and last 100 chars of dead code
print(f"\nDead code starts with: {repr(dead_code_clean[:80])}")
print(f"Dead code ends with: {repr(dead_code_clean[-80:])}")

# =========================================================
# Build the new function structure
# =========================================================

# The event listeners need: config, state, app, user, role
# Currently these are defined inside renderRole. Move them OUT.

# New structure:
# function renderBusinessDashboardPage() {
#   // existing code up to roleQuery...
#   const role = state.activeRole || 'merchant';
#   const config = state[role];
#   
#   const renderRole = (role) => {
#     // only: const addOnRows, const listingLabels, return template
#     return `...template...`;
#   };
#   
#   app.innerHTML = renderRole(role);
#   
#   // ALL event listeners here (they close over config, state, app, user, role)
#   ...
# }

# Find where "const roleQuery" line is to insert role/config definitions after it
role_query_pos = content.find("const roleQuery", fn_start)
role_query_line = content[:role_query_pos].count("\n") + 1
print(f"\nconst roleQuery at line {role_query_line}")

# Find the end of the roleQuery block (the if statement)
role_query_block_end = content.find("const renderRole = (role) => {", fn_start)
print(f"Area between roleQuery and renderRole: lines {role_query_line}-{role_def_line}")

# Show what's between const roleQuery and const renderRole
between = content[role_query_pos:role_def_line]
print(f"Content between: {repr(between[:100])}")
