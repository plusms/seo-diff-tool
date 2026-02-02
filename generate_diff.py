
import difflib

text1 = """
Line 1
Line 2
Line 3
""".strip().splitlines()

text2 = """
Line 1
Line 2 changed
Line 3
Line 4 added
""".strip().splitlines()

html_diff = difflib.HtmlDiff().make_file(text1, text2)

with open('sample_diff.html', 'w', encoding='utf-8') as f:
    f.write(html_diff)

print("Generated sample_diff.html")
