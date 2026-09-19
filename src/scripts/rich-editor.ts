// WYSIWYG body editor for posts and pages (TipTap / ProseMirror).
// The editor stays in sync with the hidden #f_body textarea, which is what the
// save handler in public/admin-editor.js reads, so saving is unchanged.
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Youtube from '@tiptap/extension-youtube';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

const mount = document.getElementById('rte');
const source = document.getElementById('f_body') as HTMLTextAreaElement | null;
const bar = document.getElementById('rteBar');
const status = document.getElementById('rteStatus');

// Markup the visual editor cannot represent (embeds, scripts, custom wrappers).
// Bodies containing it open in HTML mode so a save never silently drops it.
const LOSSY = /<(script|style|div|section|article|figure|video|audio|embed|object|form|svg|span\s+[^>]*style)\b|<iframe(?![^>]*youtube)/i;

if (mount && source && bar) {
  const ImageWithLazy = Image.extend({
    addAttributes() {
      return { ...this.parent?.(), loading: { default: 'lazy' } };
    },
  });

  const editor = new Editor({
    element: mount,
    content: source.value,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener', target: null } }),
      ImageWithLazy.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your story… Type here, paste from Word or Google Docs, or use the toolbar.' }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    editorProps: { attributes: { class: 'prose', spellcheck: 'true' } },
    onUpdate: ({ editor }) => { if (!htmlMode) { source.value = editor.getHTML(); refresh(); } },
    onSelectionUpdate: () => refresh(),
    onTransaction: () => refresh(),
  });

  let htmlMode = false;
  const words = () => {
    const text = htmlMode ? source.value.replace(/<[^>]*>/g, ' ') : editor.getText();
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  // ---- toolbar ----
  type Btn = { k: string; t: string; label: string; run: () => void; on?: () => boolean };
  const c = () => editor.chain().focus();
  const buttons: (Btn | '|')[] = [
    { k: 'undo', t: 'Undo (Ctrl+Z)', label: '↶', run: () => c().undo().run() },
    { k: 'redo', t: 'Redo (Ctrl+Shift+Z)', label: '↷', run: () => c().redo().run() },
    '|',
    { k: 'p', t: 'Paragraph', label: '¶', run: () => c().setParagraph().run(), on: () => editor.isActive('paragraph') },
    { k: 'h2', t: 'Heading', label: 'H2', run: () => c().toggleHeading({ level: 2 }).run(), on: () => editor.isActive('heading', { level: 2 }) },
    { k: 'h3', t: 'Subheading', label: 'H3', run: () => c().toggleHeading({ level: 3 }).run(), on: () => editor.isActive('heading', { level: 3 }) },
    { k: 'h4', t: 'Minor heading', label: 'H4', run: () => c().toggleHeading({ level: 4 }).run(), on: () => editor.isActive('heading', { level: 4 }) },
    '|',
    { k: 'b', t: 'Bold (Ctrl+B)', label: '<b>B</b>', run: () => c().toggleBold().run(), on: () => editor.isActive('bold') },
    { k: 'i', t: 'Italic (Ctrl+I)', label: '<i>I</i>', run: () => c().toggleItalic().run(), on: () => editor.isActive('italic') },
    { k: 'u', t: 'Underline (Ctrl+U)', label: '<u>U</u>', run: () => c().toggleUnderline().run(), on: () => editor.isActive('underline') },
    { k: 's', t: 'Strikethrough', label: '<s>S</s>', run: () => c().toggleStrike().run(), on: () => editor.isActive('strike') },
    { k: 'mark', t: 'Highlight', label: '<mark>H</mark>', run: () => c().toggleHighlight().run(), on: () => editor.isActive('highlight') },
    { k: 'link', t: 'Link (Ctrl+K)', label: '🔗', run: () => setLink(), on: () => editor.isActive('link') },
    '|',
    { k: 'ul', t: 'Bulleted list', label: '•≡', run: () => c().toggleBulletList().run(), on: () => editor.isActive('bulletList') },
    { k: 'ol', t: 'Numbered list', label: '1≡', run: () => c().toggleOrderedList().run(), on: () => editor.isActive('orderedList') },
    { k: 'quote', t: 'Quote', label: '❝', run: () => c().toggleBlockquote().run(), on: () => editor.isActive('blockquote') },
    { k: 'code', t: 'Code block', label: '{ }', run: () => c().toggleCodeBlock().run(), on: () => editor.isActive('codeBlock') },
    { k: 'hr', t: 'Divider', label: '―', run: () => c().setHorizontalRule().run() },
    '|',
    { k: 'left', t: 'Align left', label: '⇤', run: () => c().setTextAlign('left').run(), on: () => editor.isActive({ textAlign: 'left' }) },
    { k: 'center', t: 'Align center', label: '↔', run: () => c().setTextAlign('center').run(), on: () => editor.isActive({ textAlign: 'center' }) },
    { k: 'right', t: 'Align right', label: '⇥', run: () => c().setTextAlign('right').run(), on: () => editor.isActive({ textAlign: 'right' }) },
    '|',
    { k: 'img', t: 'Image from Media library', label: '🖼 Image', run: () => document.getElementById('insertImg')?.click() },
    { k: 'yt', t: 'YouTube video', label: '▶ Video', run: () => {
      const url = prompt('YouTube video URL'); if (url) c().setYoutubeVideo({ src: url }).run();
    } },
    { k: 'table', t: 'Insert table', label: '▦ Table', run: () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { k: 'clear', t: 'Clear formatting', label: '⌫', run: () => c().unsetAllMarks().clearNodes().run() },
  ];
  const tableButtons: Btn[] = [
    { k: 'row+', t: 'Add row below', label: '+ Row', run: () => c().addRowAfter().run() },
    { k: 'col+', t: 'Add column right', label: '+ Col', run: () => c().addColumnAfter().run() },
    { k: 'row-', t: 'Delete row', label: '− Row', run: () => c().deleteRow().run() },
    { k: 'col-', t: 'Delete column', label: '− Col', run: () => c().deleteColumn().run() },
    { k: 'tbl-', t: 'Delete table', label: '✕ Table', run: () => c().deleteTable().run() },
  ];

  const all = new Map<string, Btn>();
  const mk = (b: Btn) => {
    all.set(b.k, b);
    return `<button type="button" class="tb" data-k="${b.k}" title="${b.t}" aria-label="${b.t}">${b.label}</button>`;
  };
  bar.innerHTML =
    `<div class="tb-group">${buttons.map((b) => (b === '|' ? '<span class="tb-sep"></span>' : mk(b))).join('')}</div>` +
    `<div class="tb-group tb-table" hidden>${tableButtons.map(mk).join('')}</div>` +
    `<div class="tb-right"><button type="button" class="tb tb-mode" data-mode title="Switch between visual and HTML editing">&lt;/&gt; HTML</button></div>`;
  bar.addEventListener('mousedown', (e) => { if ((e.target as HTMLElement).closest('.tb')) e.preventDefault(); });
  bar.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest('.tb') as HTMLElement | null; if (!el) return;
    if (el.hasAttribute('data-mode')) return toggleMode();
    all.get(el.dataset.k!)?.run();
  });

  function setLink() {
    const prev = editor.getAttributes('link').href || '';
    const url = prompt('Link URL (leave empty to remove)', prev);
    if (url === null) return;
    if (!url.trim()) return void c().extendMarkRange('link').unsetLink().run();
    const href = /^(https?:|mailto:|tel:|\/|#)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    c().extendMarkRange('link').setLink({ href }).run();
  }
  editor.view.dom.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setLink(); }
  });

  function refresh() {
    bar!.querySelectorAll<HTMLElement>('.tb[data-k]').forEach((el) => {
      const b = all.get(el.dataset.k!);
      el.classList.toggle('on', !htmlMode && !!b?.on?.());
      (el as HTMLButtonElement).disabled = htmlMode;
    });
    (bar!.querySelector('.tb-table') as HTMLElement).hidden = htmlMode || !editor.isActive('table');
    if (status) status.textContent = `${words()} words · ~${Math.max(1, Math.round(words() / 200))} min read`;
  }

  function toggleMode(force?: boolean) {
    const toHtml = force ?? !htmlMode;
    if (!toHtml && LOSSY.test(source!.value) &&
        !confirm('This HTML contains elements the visual editor cannot keep (embeds, custom <div>s, scripts). Switching to visual mode will remove them. Continue?')) return;
    htmlMode = toHtml;
    // Visual edits are mirrored into the textarea on every update, so going
    // to HTML mode needs no copy (and an untouched body keeps its original markup).
    if (!htmlMode) editor.commands.setContent(source!.value, true);
    mount!.hidden = htmlMode;
    source!.hidden = !htmlMode;
    const m = bar!.querySelector('[data-mode]')!;
    m.innerHTML = htmlMode ? '👁 Visual' : '&lt;/&gt; HTML';
    m.classList.toggle('on', htmlMode);
    refresh();
    if (htmlMode) source!.focus(); else editor.commands.focus();
  }
  source.addEventListener('input', refresh);

  // Used by the Media picker in admin-editor.js.
  (window as any).__rte = {
    insertImage(url: string, alt = '') {
      if (htmlMode) {
        const pos = source!.selectionStart ?? source!.value.length;
        source!.value = source!.value.slice(0, pos) + `\n<img src="${url}" alt="${alt}" loading="lazy" />\n` + source!.value.slice(pos);
        return;
      }
      c().setImage({ src: url, alt }).run();
    },
  };

  if (LOSSY.test(source.value)) {
    toggleMode(true);
    const n = document.getElementById('rteNotice');
    if (n) { n.hidden = false; n.textContent = 'This post contains embeds or custom HTML, so it opened in HTML mode to keep them intact.'; }
  } else {
    source.hidden = true;
    refresh();
  }
}
