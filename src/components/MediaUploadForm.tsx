'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { uploadMedia } from '@/app/panel/medya/actions'
import type { MediaNotice } from '@/app/panel/medya/notices'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, MAX_UPLOAD_MEGAPIXELS, OVERSIZE_MESSAGE } from '@/lib/media-limits'
import type { FormState } from '@/lib/validation'
import styles from './MediaUploadForm.module.css'

// Değer değil yalnız TİP alınıyor (bkz. ArticleForm): validation.ts modül seviyesinde
// z.config çağırdığı için yan etkili ve değer import'u zod'u istemci paketine sokuyor.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

type MediaUploadFormProps = {
  /**
   * Yönlendirmeden sonra adres üzerinden taşınan bildirim. Başarılı yükleme ve silme
   * yönlendirme yaptığı için useActionState o sonucu hiç görmez; sayfa mesajı buraya verir.
   */
  notice?: MediaNotice
}

export function MediaUploadForm({ notice }: MediaUploadFormProps) {
  const [state, formAction, isPending] = useActionState(uploadMedia, INITIAL_STATE)
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const [altText, setAltText] = useState('')
  // Seçilen dosya durumda TUTULUYOR. Gerekçe ölçüldü: React 19 form action'dan sonra
  // denetimsiz alanları sıfırlıyor ve <input type="file"> denetimli yazılamaz — başarısız
  // bir gönderimden sonra dosya sessizce kayboluyordu. Kullanıcı alt metni düzeltip
  // "Yükle"ye basınca bu kez "Yüklenecek bir dosya seçin." hatası alıyor, neyi yanlış
  // yaptığını anlamıyordu. Dosya burada saklanıp gönderimde forma geri konuyor.
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Odak açıkça bildirime taşınıyor. İki gerekçe (makale listesindeki desenle aynı):
  // 1. Canlı bölge DEĞİŞİMİ duyurur; bildirim yönlendirmeden sonraki ilk çizimde zaten
  //    sayfada olduğu için okunmayabilir, odaklanan öğe ise her durumda okunur.
  // 2. Silmede odağı tetikleyen düğme kartla birlikte kalkıyor; müdahale edilmezse odak
  //    <body>'ye düşer ve klavye kullanıcısı sonucu hiç öğrenemez (WCAG 4.1.3).
  useEffect(() => {
    noticeRef.current?.focus()
  }, [])

  const fieldError = (field: string): string | undefined => state.errors[field]?.join(' ')

  // Sunucuya hiç gitmeden yakalanan boyut hatası. Bu bir GÜVENLİK denetimi değil kolaylık:
  // asıl sınır storeImage içinde, sunucuda. Buradaki denetimin gerçek işi, Next'in server
  // action gövde sınırını aşan bir isteğin hata SAYFASI üretmesini önlemek (ölçüldü:
  // sınır aşılınca istek action'a ulaşmıyor, kullanıcı "Bir hata oluştu" sayfası görüyor).
  const sizeError = selectedFile !== null && selectedFile.size > MAX_UPLOAD_BYTES ? OVERSIZE_MESSAGE : undefined
  const fileError = sizeError ?? fieldError('file')
  const altError = fieldError('altText')

  // Action koştuysa adresten gelen bildirim artık BAYAT: kullanıcı yeni bir gönderim yaptı
  // ve onun sonucunu görmeli. INITIAL_STATE bir modül sabiti, referans karşılaştırması
  // "action henüz koşmadı" bilgisini veriyor (ArticleForm deseni).
  const actionRan = state !== INITIAL_STATE
  const gosterilecekBildirim = actionRan ? undefined : notice
  const formError = actionRan ? state.message : undefined
  // Gönderimden sonra girdi boşaldığı için seçim yalnız durumda kalıyor; kullanıcı hangi
  // dosyanın gönderileceğini görmeli, aksi hâlde boş görünen bir alan yükleme yapardı.
  const hatirlananDosya = actionRan && selectedFile !== null ? selectedFile.name : undefined

  return (
    // noValidate: alanlar `required` ama tarayıcının kendi balonu gönderimi durdurursa
    // sunucunun Türkçe mesajı hiç görünmez ve zorunluluğun SUNUCUDA uygulandığı
    // doğrulanamaz. `required` erişilebilirlik ağacında kalıyor (ArticleForm deseni).
    <form
      action={(formData) => {
        // Girdi sıfırlandıysa saklanan dosya forma geri konuyor. Dosya girdisine programla
        // değer yazılamaz (tarayıcı güvenlik kuralı), bu yüzden düzeltme gönderim anında
        // FormData üzerinde yapılıyor.
        const gonderilen = formData.get('file')
        if (selectedFile !== null && (!(gonderilen instanceof File) || gonderilen.size === 0)) {
          formData.set('file', selectedFile)
        }
        formAction(formData)
      }}
      className={styles.form}
      noValidate
    >
      {gosterilecekBildirim ? (
        <p
          ref={noticeRef}
          tabIndex={-1}
          role="status"
          className={gosterilecekBildirim.warning ? styles.warning : styles.notice}
        >
          {gosterilecekBildirim.message}
        </p>
      ) : null}

      {formError ? (
        <p role="alert" className={styles.alert}>
          {formError}
        </p>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="media-file" className={styles.label}>
          Görsel dosyası
        </label>
        <input
          id="media-file"
          name="file"
          type="file"
          required
          accept="image/*"
          className={styles.file}
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={[
            fileError ? 'media-file-error' : 'media-file-hint',
            hatirlananDosya === undefined ? null : 'media-file-remembered',
          ]
            .filter((id) => id !== null)
            .join(' ')}
        />
        <p id="media-file-hint" className={styles.hint}>
          JPEG, PNG, WebP veya GIF; en fazla {MAX_UPLOAD_MB} MB ve {MAX_UPLOAD_MEGAPIXELS}{' '}
          megapiksel. Görsel 1600 piksel genişliğe indirilip WebP olarak saklanır;
          animasyonlu GIF’in yalnız ilk karesi kaydedilir.
        </p>
        {hatirlananDosya === undefined ? null : (
          <p id="media-file-remembered" className={styles.hint}>
            Seçili dosya: {hatirlananDosya} — yeniden göndermek için başka bir dosya seçmenize
            gerek yok.
          </p>
        )}
        {fileError ? (
          // role="alert": aria-describedby hatayı yalnız alana odaklanınca okutur; formu
          // gönderip odağı düğmede bırakan ekran okuyucu kullanıcısı sonucu duymaz.
          <p id="media-file-error" role="alert" className={styles.fieldError}>
            {fileError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="media-alt" className={styles.label}>
          Alt metin
        </label>
        <input
          id="media-alt"
          name="altText"
          required
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          className={styles.input}
          aria-invalid={altError ? true : undefined}
          aria-describedby={altError ? 'media-alt-error' : 'media-alt-hint'}
        />
        <p id="media-alt-hint" className={styles.hint}>
          Görselin ne gösterdiğini yazın; ekran okuyucu kullanıcısı yalnız bu metni duyar.
        </p>
        {altError ? (
          <p id="media-alt-error" role="alert" className={styles.fieldError}>
            {altError}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        {/* Boyut hatasında düğme kilitli: gönderilseydi istek Next'in gövde sınırına
            takılır ve kullanıcı alan hatası yerine hata sayfası görürdü. */}
        <button type="submit" className={styles.primary} disabled={isPending || sizeError !== undefined}>
          {isPending ? 'Yükleniyor…' : 'Yükle'}
        </button>
      </div>
    </form>
  )
}
