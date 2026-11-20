// Only display notes are editable; document files, date and page counts are fixed.
const governanceNotes = ZIOK_CONTENT?.documents ?? ZIOK_COMMUNITY_DEFAULTS.documents;
for (const note of governanceNotes) {
  if (!note.noteEn && !note.noteZo) continue;
  const card = document.getElementById(note.type + '-card');
  if (!card) continue;
  const paragraph = document.createElement('p'); paragraph.className = 'sub';
  paragraph.dataset.contentEn = note.noteEn || note.noteZo;
  paragraph.dataset.contentZo = note.noteZo || note.noteEn;
  paragraph.textContent = paragraph.dataset.contentEn;
  card.insertBefore(paragraph, card.querySelector('.actions'));
}
