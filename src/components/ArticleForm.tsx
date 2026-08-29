'use client'

import type { ReactNode } from 'react'

import { useActionState, useState } from 'react'
import { saveArticle } from '@/app/panel/makaleler/actions'
import type { SelectOption } from '@/db/queries/articles'
import type { MediaOption } from '@/db/queries/media'
import type { FormState } from '@/lib/validation'
import { FormResultProvider, useResultCount } from './EntityForm'
import { MediaPicker } from './MediaPicker'
import { PublishChecklist } from './PublishChecklist'
import { RichTextEditor } from './RichTextEditor'
import styles from './ArticleForm.module.css'

// Değer değil yalnız TİP alınıyor (bkz. LoginForm): validation.ts modül seviyesinde
// z.config çağırdığı için yan etkili ve değer import'u zod'u istemci paketine sokuyor.
const INITIAL_STATE: FormState = { ok: false, errors: {} }

export type ArticleFormValues = {
  id: number | null
  title: string
  slug: string
  excerpt: string
  content: string
  /** Seçim yapılmadığında boş dize; sütun NULL bekliyor. */
  categoryId: string
  authorId: string
  practiceAreaId: string
  coverMediaId: string
}

const EMPTY_VALUES: ArticleFormValues = {
  id: null, title: '', slug: '', excerpt: '', content: '', categoryId: '', authorId: '',
  practiceAreaId: '', coverMediaId: '',
}

type ArticleFormProps = {
  values?: ArticleFormValues
  categories: SelectOption[]
  authors: SelectOption[]
  practiceAreaOptions: SelectOption[]
  /** Kapak görseli seçicisinin kaynağı; kitaplık boşsa seçici açıklama gösterir. */
  mediaOptions: MediaOption[]
  /** Yeni kayıttan sonraki yönlendirmeyle taşınan bildirim. */
  initialMessage?: string
  /**
   * Sağ bölmenin sonuna yerleştirilen sunucu tarafı blok — reklam yasağı hatırlatması
   * (AdBanNotice) buradan geliyor. Slot olarak geçiriliyor çünkü bu bileşen 'use client':
   * doğrudan import etmek sunucu bileşenini istemci paketine sürüklerdi. Devir tasarımı
   * (5d) o bloğu formun SAĞ bölmesinde istiyor; daha önce sayfa düzeyinde ayrı bir üçüncü
   * sütundu ve editör 1440px'te üç sütuna bölünüp yazma alanı 304px'e iniyordu.
   */
  aside?: ReactNode
}

export function ArticleForm({
  values = EMPTY_VALUES,
  categories,
  authors,
  practiceAreaOptions,
  mediaOptions,
  initialMessage, aside }: ArticleFormProps) {
  // ÜÇ ADIMLI SİHİRBAZ — YALNIZ MOBİLDE (devir tasarımı 4a; ≤1100px). Masaüstünde
  // adımlar CSS ile kapatılıyor ve bütün alanlar iki bölmede birden görünüyor, yani bu
  // durum orada hiçbir şeyi etkilemiyor.
  //
  // TEK FORM, TEK GÖNDERİM: adımlar yalnız GÖRÜNÜM. Alanlar her adımda DOM'da kalıyor
  // (display:none ile gizleniyor), çünkü form gönderildiğinde hepsinin FormData'ya
  // girmesi gerekiyor — adım başına ayrı form kurmak sunucu sözleşmesini üçe bölerdi.
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [state, formAction, isPending] = useActionState(saveArticle, INITIAL_STATE)

  // Alanlar denetimli tutuluyor: React 19 form action'dan sonra denetimsiz alanları
  // defaultValue'suna döndürebiliyor. Reklam yasağı uyarısı geldiğinde form yeniden
  // gönderilmek zorunda; başlık ve özet o arada sıfırlanırsa kullanıcı yazdığını kaybeder.
  const [title, setTitle] = useState(values.title)
  const [slug, setSlug] = useState(values.slug)
  const [excerpt, setExcerpt] = useState(values.excerpt)
  const [categoryId, setCategoryId] = useState(values.categoryId)
  const [authorId, setAuthorId] = useState(values.authorId)
  const [practiceAreaId, setPracticeAreaId] = useState(values.practiceAreaId)
  const [coverMediaId, setCoverMediaId] = useState(values.coverMediaId)

  // Her sonuçta değişen anahtar: ardışık iki kaydetme aynı metni üretiyor ve canlı bölge
  // aynı DOM düğümünde değişmeyen metni duyurmuyor (gerekçe useResultCount'un başında).
  const noticeKey = useResultCount(state)

  // INITIAL_STATE bir modül sabiti; useActionState action çözülene kadar tam o nesneyi
  // geri veriyor. Referans karşılaştırması "action henüz koşmadı" bilgisini veriyor:
  // aksi hâlde uyarı ekranında yönlendirmeden kalan "kaydedildi" bildirimi asılı kalır
  // ve kullanıcı kaydedilmeyen bir metni kaydedilmiş sanır.
  const actionRan = state !== INITIAL_STATE
  const notice = actionRan ? (state.ok ? state.message : undefined) : initialMessage
  const formError = actionRan && !state.ok ? state.message : undefined
  const fieldError = (field: string): string | undefined => state.errors[field]?.join(' ')

  const titleError = fieldError('title')
  const slugError = fieldError('slug')
  const excerptError = fieldError('excerpt')
  const contentError = fieldError('content')
  const categoryError = fieldError('categoryId')
  const authorError = fieldError('authorId')
  const practiceAreaError = fieldError('practiceAreaId')
  const coverError = fieldError('coverMediaId')

  // HATALI ADIMA GERİ DÖN (yalnız mobilde bir etkisi var; masaüstünde bütün bölümler
  // zaten görünür).
  //
  // Sihirbaz olmadan bu sorun yoktu: bütün alanlar tek kolonda duruyordu ve hata nerede
  // olursa olsun görünüyordu. Adımlara bölününce kullanıcı "Yayımla"ya birinci adımdan
  // basabiliyor, sunucu üçüncü adımdaki kategori alanına hata yazıyor ve ekranda HİÇBİR
  // ŞEY değişmemiş gibi görünüyordu — düğme çalışmıyor sanılırdı.
  //
  // useEffect DEĞİL, RENDER SIRASINDA türetme: React 19 effect içinde senkron setState'i
  // kaskad render olarak işaretliyor (lint kuralı). Kalıp PublishChecklist'teki
  // "önceki değeri sakla, değiştiyse durumu düzelt" deseniyle birebir aynı.
  //
  // Tetikleyici `noticeKey`: her sunucu sonucunda artan sayaç (useResultCount). Kullanıcı
  // adımı elle değiştirdiğinde sayaç değişmediği için buraya girilmiyor — yani seçim
  // kullanıcının elinden alınmıyor.
  const [previousResult, setPreviousResult] = useState(noticeKey)
  if (previousResult !== noticeKey) {
    setPreviousResult(noticeKey)
    if (titleError !== undefined || excerptError !== undefined || contentError !== undefined) {
      setStep(1)
    } else if (coverError !== undefined) {
      setStep(2)
    } else if (
      slugError !== undefined ||
      categoryError !== undefined ||
      authorError !== undefined ||
      (state.warnings !== undefined && state.warnings.length > 0)
    ) {
      // Reklam yasağı uyarısı da üçüncü adımda: onay kutusu denetim listesinin içinde.
      setStep(3)
    }
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {values.id === null ? null : <input type="hidden" name="id" value={values.id} readOnly />}

      {notice ? (
        <p key={`bildirim-${noticeKey}`} role="status" className={styles.notice}>
          {notice}
        </p>
      ) : null}

      {formError ? (
        <p key={`hata-${noticeKey}`} role="alert" className={styles.alert}>
          {formError}
        </p>
      ) : null}

      {/* İKİ BÖLMELİ EDİTÖR (devir tasarımı 5d): solda yazının kendisi, sağda yayın
          kararları. DOM SIRASI DEĞİŞMEDİ — sağ bölme klavye sırasında hâlâ içerikten
          SONRA geliyor ve gönderme düğmeleri en sonda. Görsel sıralama için DOM'u
          bozmak, klavye kullanıcısını formu doldurmadan "Yayımla"ya düşürürdü. */}
      {/* ADIM GEZİNMESİ — yalnız mobilde çiziliyor (CSS). Üç çip doğrudan hedef adıma
          götürüyor; "Geri/İleri" çifti yerine bu seçildi çünkü kullanıcı çoğu zaman tek
          bir alanı düzeltmek için geri dönüyor ve iki düğmeyle gezinmek onu ara adımdan
          geçmeye zorluyordu.

          Çipler <button type="button">: varsayılan submit olsaydı adım değiştirmek formu
          gönderirdi. aria-current="step" ile etkin adım ekran okuyucuya da bildiriliyor —
          renk tek başına taşımıyor (WCAG 1.4.1). */}
      <nav className={styles.steps} aria-label="Editör adımları">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            className={styles.step}
            aria-current={step === n ? 'step' : undefined}
            onClick={() => setStep(n)}
          >
            <span className={styles.stepNo}>{n}</span>
            {n === 1 ? 'Metin' : n === 2 ? 'Görsel' : 'Yayın'}
          </button>
        ))}
      </nav>

      <div className={styles.split} data-adim={step}>
        <div className={styles.mainPane} data-bolum="1">

      <div className={styles.field}>
        <label htmlFor="article-title" className={styles.label}>
          Başlık
        </label>
        <input
          id="article-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`${styles.input} ${styles.titleInput}`}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? 'article-title-error' : undefined}
        />
        {/* role="alert": aria-describedby hatayı yalnız girdiye odaklanınca okutur; formu
            gönderip odağı düğmede bırakan ekran okuyucu kullanıcısı sonucu duymaz. */}
        {titleError ? (
          <p id="article-title-error" role="alert" className={styles.fieldError}>
            {titleError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="article-excerpt" className={styles.label}>
          Özet
        </label>
        <textarea
          id="article-excerpt"
          name="excerpt"
          rows={3}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className={styles.textarea}
          aria-invalid={excerptError ? true : undefined}
          aria-describedby={excerptError ? 'article-excerpt-error' : undefined}
        />
        {excerptError ? (
          <p id="article-excerpt-error" role="alert" className={styles.fieldError}>
            {excerptError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>İçerik</span>
        <RichTextEditor
          name="content"
          defaultValue={values.content}
          label="İçerik"
          invalid={contentError ? true : undefined}
          describedBy={contentError ? 'article-content-error' : undefined}
        />
        {contentError ? (
          <p id="article-content-error" role="alert" className={styles.fieldError}>
            {contentError}
          </p>
        ) : null}
      </div>

        </div>

        <aside className={styles.sidePane}>
        <div className={styles.card} data-bolum="3">
          <h2 className={styles.cardTitle}>Yayın bilgileri</h2>

      <div className={styles.field}>
        <label htmlFor="article-slug" className={styles.label}>
          Adres (slug)
        </label>
        <input
          id="article-slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          className={styles.input}
          aria-invalid={slugError ? true : undefined}
          aria-describedby={slugError ? 'article-slug-error' : 'article-slug-hint'}
        />
        <p id="article-slug-hint" className={styles.hint}>
          Boş bırakılırsa başlıktan üretilir.
        </p>
        {slugError ? (
          <p id="article-slug-error" role="alert" className={styles.fieldError}>
            {slugError}
          </p>
        ) : null}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="article-category" className={styles.label}>
            Kategori
          </label>
          {/* Denetimsiz + her sonuçta yeniden kurulan alan; gerekçesi FormResultProvider'da.
              Denetimli bırakıldığında ölçüldü: reklam yasağı uyarısından sonra seçim
              "Seçilmedi"e dönüyor ve kullanıcı ikinci gönderimde kategori hatası alıyordu. */}
          <select
            key={noticeKey}
            id="article-category"
            name="categoryId"
            defaultValue={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={styles.select}
            aria-invalid={categoryError ? true : undefined}
            aria-describedby={categoryError ? 'article-category-error' : undefined}
          >
            <option value="">Seçilmedi</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {categoryError ? (
            <p id="article-category-error" role="alert" className={styles.fieldError}>
              {categoryError}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="article-author" className={styles.label}>
            Yazar
          </label>
          {/* Denetimsiz + her sonuçta yeniden kurulan alan; gerekçesi FormResultProvider'da. */}
          <select
            key={noticeKey}
            id="article-author"
            name="authorId"
            defaultValue={authorId}
            onChange={(event) => setAuthorId(event.target.value)}
            className={styles.select}
            aria-invalid={authorError ? true : undefined}
            aria-describedby={authorError ? 'article-author-error' : 'article-author-hint'}
          >
            <option value="">Seçilmedi</option>
            {authors.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {authors.length === 0 ? (
            <p id="article-author-hint" className={styles.hint}>
              Kadro kaydı eklendikçe burada listelenir.
            </p>
          ) : null}
          {authorError ? (
            <p id="article-author-error" role="alert" className={styles.fieldError}>
              {authorError}
            </p>
          ) : null}
        </div>
      </div>

      {/* ÇALIŞMA ALANI — kategoriden AYRI bir eksen: kategori yazının yayın rafı (arşiv
          filtresi), bu ise hangi hukuk alanına ait olduğu. Alan detay sayfası "bu
          alandaki yazılar"ı buradan topluyor.

          Zorunlu DEĞİL, yayımda bile: genel bilgilendirme yazılarının hiçbir alana ait
          olmaması meşru. Denetimsiz + her sonuçta yeniden kurulan alan; gerekçesi
          FormResultProvider'da (kategori ve yazar seçicileriyle aynı). */}
      <div className={styles.field}>
        <label htmlFor="article-practice-area" className={styles.label}>
          Çalışma alanı
        </label>
        <select
          key={noticeKey}
          id="article-practice-area"
          name="practiceAreaId"
          defaultValue={practiceAreaId}
          onChange={(event) => setPracticeAreaId(event.target.value)}
          className={styles.select}
          aria-invalid={practiceAreaError ? true : undefined}
          aria-describedby={
            practiceAreaError ? 'article-practice-area-error' : 'article-practice-area-hint'
          }
        >
          <option value="">Seçilmedi</option>
          {practiceAreaOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p id="article-practice-area-hint" className={styles.hint}>
          Seçilirse yazı, o alanın sayfasında listelenir.
        </p>
        {practiceAreaError ? (
          <p id="article-practice-area-error" role="alert" className={styles.fieldError}>
            {practiceAreaError}
          </p>
        ) : null}
      </div>

        </div>

        <div className={styles.card} data-bolum="2">
      <div className={styles.field}>
        {/* Seçici de sonuç sayacına ihtiyaç duyuyor (radyolar sıfırlanıyor); ArticleForm
            EntityForm kabuğunu kullanmadığı için sağlayıcı burada, tek alanın çevresinde. */}
        <FormResultProvider value={noticeKey}>
          <MediaPicker
            name="coverMediaId"
            options={mediaOptions}
            value={coverMediaId}
            onChange={setCoverMediaId}
            describedBy={coverError ? 'article-cover-error' : undefined}
          />
        </FormResultProvider>
        {coverError ? (
          <p id="article-cover-error" role="alert" className={styles.fieldError}>
            {coverError}
          </p>
        ) : null}
      </div>

        </div>

      <div data-bolum="3">
        <PublishChecklist warnings={state.warnings} />
      </div>

      {/* İki gönderme düğmesi: basılan düğmenin name/value çifti FormData'ya girer ve
          durumu belirler. Gönderim sırasında ikisi de kilitleniyor. */}
      {/* Eylemler HİÇBİR ADIMA bağlı değil: metni yazan kullanıcı üçüncü adıma geçmeden
          taslak kaydedebilmeli. Adımlara kilitlenmiş bir "kaydet", yarım kalan yazıyı
          kaybetmenin en kolay yolu olurdu. */}
      <div className={styles.actions}>
        <button type="submit" name="status" value="draft" className={styles.secondary} disabled={isPending}>
          Taslak olarak kaydet
        </button>
        <button type="submit" name="status" value="published" className={styles.primary} disabled={isPending}>
          Yayımla
        </button>
      </div>

      {aside}
        </aside>
      </div>
    </form>
  )
}
