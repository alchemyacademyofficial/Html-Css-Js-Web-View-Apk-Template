// Pocket Vault Offline Core Engine
const STORAGE_KEY = 'pocket_vault_notes_v1';

let notes = [];
let currentNoteId = null;
let activeTag = 'all';

// Native Android Bridge Helper (Safe Fallback)
function triggerHaptic(duration = 25) {
  if (window.Android && window.Android.vibrate) {
    window.Android.vibrate(duration);
  } else if (navigator.vibrate) {
    navigator.vibrate(duration);
  }
}

function showNativeToast(msg) {
  if (window.Android && window.Android.showToast) {
    window.Android.showToast(msg);
  }
}

// Load notes from local storage or initialize sample notes
function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      notes = JSON.parse(raw);
    } else {
      notes = [
        {
          id: 'note-1',
          title: 'Welcome to Offline Vault!',
          content: 'This app is running 100% offline directly from your device storage or compiled Android APK.\n\nKey features:\n- Zero network required\n- Instant persistent localStorage\n- Fast search and tags filter\n- Native Android vibrations and back-button support',
          tags: ['ideas', 'offline'],
          updatedAt: Date.now() - 3600000
        },
        {
          id: 'note-2',
          title: 'Android APK Deployment Checklist',
          content: '1. Package Name: com.offline.pocketnotes\n2. Offline Service Worker Active\n3. Tested on Android device emulator\n4. Ready for one-click APK export!',
          tags: ['work', 'todo'],
          updatedAt: Date.now() - 7200000
        }
      ];
      saveNotes();
    }
  } catch (e) {
    console.error('Failed to load notes', e);
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Storage quota exceeded or error', e);
  }
}

// Render Notes
function renderNotes() {
  const notesGrid = document.getElementById('notesGrid');
  const emptyState = document.getElementById('emptyState');
  const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
  const noteCount = document.getElementById('noteCount');

  const filtered = notes.filter(n => {
    const matchesTag = activeTag === 'all' || (n.tags && n.tags.includes(activeTag));
    const matchesSearch = !searchVal || 
      n.title.toLowerCase().includes(searchVal) || 
      n.content.toLowerCase().includes(searchVal) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(searchVal)));
    return matchesTag && matchesSearch;
  });

  noteCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;

  if (filtered.length === 0) {
    notesGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  notesGrid.innerHTML = filtered.map(n => {
    const dateStr = new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const tagsHtml = (n.tags || []).map(t => `<span class="badge">#${escapeHtml(t)}</span>`).join('');
    return `
      <div class="note-card" onclick="openNote('${n.id}')">
        <h3 class="note-card-title">${escapeHtml(n.title || 'Untitled Note')}</h3>
        <p class="note-card-preview">${escapeHtml(n.content || 'No content')}</p>
        <div class="note-card-footer">
          <div class="note-tags-badge">${tagsHtml}</div>
          <span>${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function openNote(id) {
  triggerHaptic(20);
  currentNoteId = id;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  document.getElementById('noteTitle').value = note.title || '';
  document.getElementById('noteContent').value = note.content || '';
  document.getElementById('noteTags').value = (note.tags || []).join(', ');
  document.getElementById('saveStatus').textContent = 'Saved locally ✓';

  document.getElementById('noteEditorView').classList.remove('hidden');
}

function createNewNote() {
  triggerHaptic(30);
  const newNote = {
    id: 'note-' + Date.now(),
    title: '',
    content: '',
    tags: activeTag !== 'all' ? [activeTag] : [],
    updatedAt: Date.now()
  };
  notes.unshift(newNote);
  saveNotes();
  openNote(newNote.id);
  setTimeout(() => document.getElementById('noteTitle').focus(), 150);
}

function handleEditorInput() {
  if (!currentNoteId) return;
  const note = notes.find(n => n.id === currentNoteId);
  if (!note) return;

  note.title = document.getElementById('noteTitle').value;
  note.content = document.getElementById('noteContent').value;
  const rawTags = document.getElementById('noteTags').value;
  note.tags = rawTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
  note.updatedAt = Date.now();

  saveNotes();
  document.getElementById('saveStatus').textContent = 'Saved locally ✓';
}

function closeEditor() {
  triggerHaptic(15);
  // Auto-remove completely empty notes
  if (currentNoteId) {
    const note = notes.find(n => n.id === currentNoteId);
    if (note && !note.title.trim() && !note.content.trim()) {
      notes = notes.filter(n => n.id !== currentNoteId);
      saveNotes();
    }
  }
  currentNoteId = null;
  document.getElementById('noteEditorView').classList.add('hidden');
  renderNotes();
}

function deleteCurrentNote() {
  if (!currentNoteId) return;
  triggerHaptic(40);
  notes = notes.filter(n => n.id !== currentNoteId);
  saveNotes();
  showNativeToast('Note deleted');
  closeEditor();
}

// Event Listeners Initialization
window.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  renderNotes();

  document.getElementById('newNoteBtn').addEventListener('click', createNewNote);
  document.getElementById('backBtn').addEventListener('click', closeEditor);
  document.getElementById('deleteNoteBtn').addEventListener('click', deleteCurrentNote);

  document.getElementById('noteTitle').addEventListener('input', handleEditorInput);
  document.getElementById('noteContent').addEventListener('input', handleEditorInput);
  document.getElementById('noteTags').addEventListener('input', handleEditorInput);

  document.getElementById('searchInput').addEventListener('input', (e) => {
    const clearBtn = document.getElementById('clearSearch');
    if (e.target.value) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
    renderNotes();
  });

  document.getElementById('clearSearch').addEventListener('click', () => {
    const input = document.getElementById('searchInput');
    input.value = '';
    document.getElementById('clearSearch').classList.add('hidden');
    renderNotes();
  });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      triggerHaptic(15);
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeTag = chip.getAttribute('data-tag');
      renderNotes();
    });
  });

  // Handle hardware Android back button emulation
  window.addEventListener('popstate', (e) => {
    if (currentNoteId) {
      closeEditor();
      e.preventDefault();
    }
  });
});
