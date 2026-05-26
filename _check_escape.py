import re

with open('assets/js/data.js', 'r') as f:
    content = f.read()

start = content.find("summary:'HK Drinks")
end = content.find("',", start)
print("Raw line:")
print(repr(content[start:end+2]))
print()

# Check if the JS is valid
try:
    import js2py  # not available, try node
except:
    pass

# Check for double backslash before quotes
count = content.count("\\\\'s")
print(f"Found \\\\'s count: {count}")
