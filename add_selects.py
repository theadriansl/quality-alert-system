import re

# Read the file
with open(r'C:\Users\The Eidrian\quality-alert-system\frontend\src\components\8D\D7Validation.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the select template
select_template_doc = '''              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <select
                  style={{ ...styles.input, fontSize: '12px', padding: '4px 6px' }}
                  value={documentsUpdated[INDEX]?.auditJudgment || ''}
                  onChange={(e) => {
                    const updated = [...documentsUpdated];
                    updated[INDEX].auditJudgment = e.target.value;
                    setDocumentsUpdated(updated);
                    updateDocument(INDEX);
                  }}
                  disabled={isBlocked}
                >
                  <option value="">--</option>
                  <option value="C">✓ Conforme</option>
                  <option value="NC">✗ No Conforme</option>
                  <option value="NA">- No Aplica</option>
                  <option value="OBS">⚠ Observación</option>
                </select>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>'''

select_template_training = '''              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <select
                  style={{ ...styles.input, fontSize: '12px', padding: '4px 6px' }}
                  value={validationData.trainingAuditJudgment}
                  onChange={(e) => setValidationData({ ...validationData, trainingAuditJudgment: e.target.value })}
                  disabled={isBlocked}
                >
                  <option value="">--</option>
                  <option value="C">✓ Conforme</option>
                  <option value="NC">✗ No Conforme</option>
                  <option value="NA">- No Aplica</option>
                  <option value="OBS">⚠ Observación</option>
                </select>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>'''

# Pattern for doc2 (Work Instructions)
pattern_doc2 = r'''(              />
              </td>
              <td style=\{\{ \.\.\.styles\.td, textAlign: 'center' \}\}>
                <div>
                  <label style=\{\{ \.\.\.styles\.fileLabel, padding: '4px 8px', fontSize: '12px' \}\}>
                    <input
                      type="file"
                      accept="\.pdf,\.xlsx,\.xls,\.docx,\.doc"
                      onChange=\{\(e\) => \{
                        if \(e\.target\.files\[0\]\) \{
                          uploadDocumentFile\(2,)'''

# Pattern for doc3 (Procedures)
pattern_doc3 = r'''(              />
              </td>
              <td style=\{\{ \.\.\.styles\.td, textAlign: 'center' \}\}>
                <div>
                  <label style=\{\{ \.\.\.styles\.fileLabel, padding: '4px 8px', fontSize: '12px' \}\}>
                    <input
                      type="file"
                      accept="\.pdf,\.xlsx,\.xls,\.docx,\.doc"
                      onChange=\{\(e\) => \{
                        if \(e\.target\.files\[0\]\) \{
                          uploadDocumentFile\(3,)'''

# Pattern for doc4 (Specifications)
pattern_doc4 = r'''(              />
              </td>
              <td style=\{\{ \.\.\.styles\.td, textAlign: 'center' \}\}>
                <div>
                  <label style=\{\{ \.\.\.styles\.fileLabel, padding: '4px 8px', fontSize: '12px' \}\}>
                    <input
                      type="file"
                      accept="\.pdf,\.xlsx,\.xls,\.docx,\.doc"
                      onChange=\{\(e\) => \{
                        if \(e\.target\.files\[0\]\) \{
                          uploadDocumentFile\(4,)'''

# Pattern for training
pattern_training = r'''(              />
              </td>
              <td style=\{\{ \.\.\.styles\.td, textAlign: 'center' \}\}>
                <div>
                  <label style=\{\{ \.\.\.styles\.fileLabel, padding: '4px 8px', fontSize: '12px' \}\}>
                    <input
                      type="file"
                      multiple
                      onChange=\{\(e\) => \{
                        Array\.from\(e\.target\.files\)\.forEach\(file => uploadTrainingFile\(file,)'''

print("Script created successfully!")
print("This script would add audit judgment selects to doc2, doc3, doc4, and training")
print("However, for safety, let's do this manually via Edit tool instead")
