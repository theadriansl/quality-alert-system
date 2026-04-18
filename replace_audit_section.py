import re

# Read the D7Validation.js file
with open(r'C:\Users\The Eidrian\quality-alert-system\frontend\src\components\8D\D7Validation.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the new table content
with open(r'C:\Users\The Eidrian\quality-alert-system\new_audit_table.txt', 'r', encoding='utf-8') as f:
    new_table = f.read()

# Find and replace the old tbody section
# Pattern: from "          <tbody>" to "      </div>" (end of audit checklist section)
pattern = r'(          <tbody>\s*{/\* SPC Validation \*/}.*?          </tbody>\s*</table>\s*</div>)'

# Replace with new content
content = re.sub(pattern, new_table.rstrip(), content, flags=re.DOTALL)

# Write back
with open(r'C:\Users\The Eidrian\quality-alert-system\frontend\src\components\8D\D7Validation.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Audit checklist section replaced successfully!")
