import glob, os

html_files = glob.glob('*.html')
count = 0
for f in sorted(html_files):
    with open(f) as fh:
        content = fh.read()
    new_content = content.replace('app.js?v=1', 'app.js?v=2').replace('data.js?v=1', 'data.js?v=2').replace('styles.css?v=1', 'styles.css?v=2')
    if new_content != content:
        with open(f, 'w') as fh:
            fh.write(new_content)
        count += 1
        print(f'Updated {f}')

print(f'\n{count} files updated')
