import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface Props {
  content: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
}

export default function RichTextEditor({ content, onChange, placeholder, editable = true, autoFocus = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Escribe una descripción…' }),
    ],
    content,
    editable,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  const btn = (label: string, active: boolean, onDown: () => void) => (
    <button
      key={label}
      className={'rte-btn' + (active ? ' active' : '')}
      onMouseDown={e => { e.preventDefault(); onDown(); }}
      title={label}
    >
      {label}
    </button>
  );

  return (
    <div
      className={'rte-wrap' + (editable ? ' editable' : '')}
      onClick={() => { if (editable) editor?.commands.focus(); }}
    >
      {editable && editor && (
        <div className="rte-toolbar">
          {btn('B', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
          {btn('I', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
          {btn('U', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
          <div className="rte-sep" />
          {btn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          {btn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          <div className="rte-sep" />
          {btn('• Lista', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
          {btn('1. Lista', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
          <div className="rte-sep" />
          {btn('`Code`', editor.isActive('code'), () => editor.chain().focus().toggleCode().run())}
          {btn('" Cita', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
        </div>
      )}
      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
}
