'use client'

import { useEffect, useState } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import styles from './RichTextEditor.module.css'

type RichTextEditorProps = {
  /** Gizli alanın adı; server action içeriği FormData'dan bu adla okur. */
  name: string
  defaultValue: string
  label: string
  /** Sunucu bu alan için hata döndürdüyse true. */
  invalid?: boolean
  /** Hata metnini taşıyan öğenin id'si; formun diğer beş alanıyla aynı bağ. */
  describedBy?: string
}

// Öznitelikler iki yerde gerekiyor: editör kurulurken ve hata durumu değiştiğinde
// (setOptions). Tek kaynakta tutulmazsa ikisi ayrışır.
function editorAttributes(label: string, invalid?: boolean, describedBy?: string): Record<string, string> {
  return {
    // contenteditable bir div'in rolü tarayıcıdan tarayıcıya değişiyor; ekran okuyucunun
    // çok satırlı metin kutusu olarak duyurması için açıkça yazılıyor.
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': label,
    ...(invalid ? { 'aria-invalid': 'true' } : {}),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    class: styles.surface,
  }
}

// Bağlantı adresi güvenilmez veri. Sunucu tarafı temizleme (sanitize.ts) son söz sahibi;
// buradaki denetim yalnız kullanıcıya anında geri bildirim vermek için.
const SAFE_LINK = /^(https?:|mailto:|tel:)/i

export function RichTextEditor({ name, defaultValue, label, invalid, describedBy }: RichTextEditorProps) {
  // Gizli alan editörün kendi yeniden çizimine DEĞİL bu duruma bağlanıyor: Tiptap 3'te
  // useEditor'ın shouldRerenderOnTransaction varsayılanı false (paket tipleriyle ölçüldü),
  // yani `value={editor.getHTML()}` yazan bir alan ilk içerikte donar ve her kayıt
  // kullanıcının yazdığını değil özgün metni geri yazardı.
  const [html, setHtml] = useState(defaultValue)

  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultValue,
    // Sunucuda çizilirse hydrate uyuşmazlığı oluyor. Ölçüldü: Tiptap 3.30.2 SSR'ı kendisi
    // algılayıp bu seçeneği zaten false'a çekiyor ve sunucu günlüğüne uyarı düşüyor —
    // yani satır bugün davranışı değiştirmiyor, sessizce doğru olanı yapıyor. Yine de
    // açıkça yazılıyor: kütüphanenin otomatik düzeltmesine bel bağlamak, o davranış bir
    // sürümde kalkarsa hydrate hatasını sessizce geri getirirdi.
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => setHtml(current.getHTML()),
    editorProps: { attributes: editorAttributes(label, invalid, describedBy) },
  })

  // Öznitelikler editör KURULURKEN okunuyor; hata gönderimden sonra geldiği için o an
  // editör çoktan ayakta. useEditor'a deps vermek editörü yeniden kurar ve kullanıcının
  // yazdığı metni siler — bu yüzden var olan örneğe setOptions ile bildiriliyor.
  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes: editorAttributes(label, invalid, describedBy) } })
  }, [editor, label, invalid, describedBy])

  return (
    <div className={styles.wrapper}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Server action FormData okuyor; editör içeriği gizli alan üzerinden gidiyor. */}
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  )
}

type ToolbarButton = {
  label: string
  active: boolean
  run: (editor: Editor) => void
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  // useEditorState olmadan araç çubuğu işlem sonrası yeniden çizilmez ve aria-pressed
  // ilk değerinde donar: ekran okuyucu kullanıcısı kalın yazıyı açtığını duymaz.
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      heading2: current?.isActive('heading', { level: 2 }) ?? false,
      heading3: current?.isActive('heading', { level: 3 }) ?? false,
      bulletList: current?.isActive('bulletList') ?? false,
      orderedList: current?.isActive('orderedList') ?? false,
      blockquote: current?.isActive('blockquote') ?? false,
      link: current?.isActive('link') ?? false,
    }),
  })

  const buttons: ToolbarButton[] = [
    { label: 'Kalın', active: active?.bold ?? false, run: (e) => e.chain().focus().toggleBold().run() },
    { label: 'Eğik', active: active?.italic ?? false, run: (e) => e.chain().focus().toggleItalic().run() },
    { label: 'Başlık 2', active: active?.heading2 ?? false, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Başlık 3', active: active?.heading3 ?? false, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Madde listesi', active: active?.bulletList ?? false, run: (e) => e.chain().focus().toggleBulletList().run() },
    { label: 'Numaralı liste', active: active?.orderedList ?? false, run: (e) => e.chain().focus().toggleOrderedList().run() },
    { label: 'Alıntı', active: active?.blockquote ?? false, run: (e) => e.chain().focus().toggleBlockquote().run() },
    { label: 'Bağlantı ekle', active: active?.link ?? false, run: addLink },
    { label: 'Bağlantıyı kaldır', active: false, run: (e) => e.chain().focus().extendMarkRange('link').unsetLink().run() },
  ]

  return (
    // toolbar rolü: ok tuşlarıyla gezinme beklentisi doğurmadan düğmeleri tek grupta toplar.
    <div role="toolbar" aria-label="Metin biçimlendirme" className={styles.toolbar}>
      {buttons.map((button) => (
        <button
          key={button.label}
          type="button"
          className={styles.tool}
          aria-pressed={button.active}
          // Editör hazır olana kadar (immediatelyRender: false) düğmeler çalışamaz.
          disabled={editor === null}
          onClick={() => editor && button.run(editor)}
        >
          {button.label}
        </button>
      ))}
    </div>
  )
}

function addLink(editor: Editor): void {
  const previous = editor.getAttributes('link').href
  // Panel içi tek alanlık soru için yerleşik istem yeterli; ayrı bir kip pencere kurmak
  // klavye tuzağı ve odak yönetimi riskini kendi elimizle eklemek olurdu.
  const answer = window.prompt('Bağlantı adresi (https://…)', typeof previous === 'string' ? previous : 'https://')
  if (answer === null) return

  const href = answer.trim()
  if (href === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  if (!SAFE_LINK.test(href)) {
    window.alert('Yalnızca http, https, mailto ve tel adresleri eklenebilir.')
    return
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
}
