#!/usr/bin/env python3
import re
with open('assets/js/data.js', 'r') as f:
    c = f.read()
# Replace final ']' with new entry
c = c.rstrip()
if c.endswith(']'):
    c = c[:-1] + "  {name:'Nikka From The Barrel', supplier:\"Watson's Wine\", area:'Central', type:'Whisky', price:'HK$698', tier:'standard', origin:'Japan', abv:'43%', description:'A well-balanced blended whisky from Nikka.'},\n]\n"
    with open('assets/js/data.js', 'w') as f:
        f.write(c)
    print('OK')
else:
    print('FAIL: ends with ' + repr(c[-20:]))
