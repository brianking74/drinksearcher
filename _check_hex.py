import codecs

with open("assets/js/data.js", "rb") as f:
    raw = f.read()

idx = raw.find(b"hkdrinks")
idx2 = raw.find(b"Hong Kong", idx)

print("Hex around 'Hong Kong' in hkdrinks:")
for i in range(idx2, idx2 + 30):
    c = chr(raw[i]) if 32 <= raw[i] < 127 else "."
    print(f"  {i}: 0x{raw[i]:02x} ({c})")

# Also show the full summary value
start = raw.find(b"summary:", idx)
print(f"\nsummary: starts at pos {start}")

# Find the opening quote after "summary:"
quote_pos = raw.find(b"'", start)
print(f"String quote at pos {quote_pos}")

# Find the closing quote
# Walk forward looking for a quote that's NOT escaped
pos = quote_pos + 1
depth = 0
while pos < len(raw):
    if raw[pos] == 0x5c:  # backslash
        pos += 2  # skip the next char (it's escaped)
        continue
    if raw[pos] == 0x27:  # single quote
        # Found the closing quote!
        print(f"Closing quote at pos {pos}")
        # Show the string value
        s = raw[quote_pos+1:pos]
        print(f"String value ({len(s)} bytes):")
        print(repr(s))
        print(f"Decoded: {s.decode('utf-8', errors='replace')}")
        break
    pos += 1
