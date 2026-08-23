'use client'

import { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import type { FormState } from '@/lib/validation'
import styles from './ContactForm.module.css'

type ContactFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>
}

// Panelin EntityForm'u DEĞİL kendi formu: EntityForm koyu panel yüzeyine ve panelin
// alan/hata düzenine göre kurulmuş, buradaki form ise sitenin krem/koyu yüzey sözleşmesinde
// ve KVKK onayı gibi panelde karşılığı olmayan bir alan taşıyor.
//
// Başlangıç durumu burada tanımlı, validation.ts'ten import EDİLMİYOR: o modül
// z.config(z.locales.tr()) yan etkisi taşıyor ve değer olarak import edilmesi zod'u istemci
// paketine çekiyor (ölçüldü: 289 KB — bkz. lib/validation.ts başındaki not). Tip importu
// derleme sonrası kayboluyor, o güvenli.
const BASLANGIC: FormState = { ok: false, errors: {} }

/**
 * Bir alanın hata metni. Bileşen MODÜL seviyesinde tanımlı, çağıranın içinde değil:
 * render sırasında oluşturulan bileşen her renderda yeni bir tip sayılır ve React onu
 * söküp yeniden kurar (react-hooks/static-components). Kimlik dışarıdan veriliyor ki
 * alanın `aria-describedby` değeriyle birebir aynı olsun.
 */
function HataMetni({ id, mesaj }: { id: string; mesaj: string | undefined }) {
  if (mesaj === undefined) return null
  return (
    <p id={id} className={styles.error}>
      {mesaj}
    </p>
  )
}

const BOS_DEGERLER = { name: '', email: '', phone: '', subject: '', body: '' }

export function ContactForm({ action }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(action, BASLANGIC)
  // Alan kimlikleri bileşen örneğine özgü: sayfada ikinci bir form çizilirse label'lar
  // yanlış alana bağlanmasın.
  const id = useId()

  /**
   * Form KONTROLLÜ (panel formlarıyla aynı desen). Kontrolsüz bırakılamaz: React 19,
   * `<form action={fn}>` gönderiminde formu eylem çalışmadan ÖNCE sıfırlıyor, yani bir
   * doğrulama hatasında ziyaretçinin yazdığı her şey siliniyordu.
   *
   * Eylemden dönen değerler render SIRASINDA aktarılıyor, useEffect ile değil: effect
   * içinde setState zincirleme render tetikliyor ve React'in react-hooks/set-state-in-effect
   * kuralı bunu hata sayıyor. Bu, React'in "önceki prop/state ile karşılaştırıp render
   * sırasında ayarlama" için önerdiği desen.
   */
  const [degerler, setDegerler] = useState(BOS_DEGERLER)
  const [oncekiState, setOncekiState] = useState(state)
  if (state !== oncekiState) {
    setOncekiState(state)
    // Başarıda `values` gelmiyor: form temizlenir. Hatada gelen değerler geri yazılır.
    setDegerler(state.values === undefined ? BOS_DEGERLER : { ...BOS_DEGERLER, ...state.values })
  }

  const alanDegistir = (alan: keyof typeof BOS_DEGERLER) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setDegerler((onceki) => ({ ...onceki, [alan]: event.target.value }))

  const hata = (alan: string): string | undefined => state.errors[alan]?.[0]

  // Alanın hata metnini kendisine bağlar; hata yoksa öznitelik hiç yazılmaz (boş bir
  // aria-describedby ekran okuyucuya var olmayan bir açıklama duyurur).
  const alanOzellikleri = (alan: string) => {
    const mesaj = hata(alan)
    return {
      'aria-invalid': mesaj === undefined ? undefined : (true as const),
      'aria-describedby': mesaj === undefined ? undefined : `${id}-${alan}-hata`,
    }
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {/* Sonuç bildirimi formun BAŞINDA: gönderim sonrası odak formda kalıyor ve ekran
          okuyucu kullanıcısı sonucu aşağıda aramak zorunda kalmamalı. role="status"
          (assertive değil) — kullanıcının yazdığı bir şeyi kesmiyor.
          Bölge her zaman DOM'da: yalnız mesaj varken eklenen bir canlı bölge, bazı ekran
          okuyucularda hiç duyurulmaz. */}
      <div role="status" aria-live="polite" className={styles.status}>
        {state.message !== undefined ? (
          <p className={state.ok ? styles.success : styles.failure}>{state.message}</p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-name`}>Ad soyad</label>
        <input
          id={`${id}-name`} name="name" type="text" required autoComplete="name"
          value={degerler.name} onChange={alanDegistir('name')}
          {...alanOzellikleri('name')}
        />
        <HataMetni id={`${id}-name-hata`} mesaj={hata('name')} />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={`${id}-email`}>E-posta</label>
          <input
            id={`${id}-email`} name="email" type="email" required autoComplete="email"
            value={degerler.email} onChange={alanDegistir('email')}
            {...alanOzellikleri('email')}
          />
          <HataMetni id={`${id}-email-hata`} mesaj={hata('email')} />
        </div>

        <div className={styles.field}>
          <label htmlFor={`${id}-phone`}>
            Telefon <span className={styles.optional}>(isteğe bağlı)</span>
          </label>
          <input
            id={`${id}-phone`} name="phone" type="tel" autoComplete="tel"
            value={degerler.phone} onChange={alanDegistir('phone')}
            {...alanOzellikleri('phone')}
          />
          <HataMetni id={`${id}-phone-hata`} mesaj={hata('phone')} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-subject`}>Konu</label>
        <input
          id={`${id}-subject`} name="subject" type="text" required
          value={degerler.subject} onChange={alanDegistir('subject')}
          {...alanOzellikleri('subject')}
        />
        <HataMetni id={`${id}-subject-hata`} mesaj={hata('subject')} />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-body`}>Mesajınız</label>
        <textarea
          id={`${id}-body`} name="body" rows={7} required
          value={degerler.body} onChange={alanDegistir('body')}
          {...alanOzellikleri('body')}
        />
        <HataMetni id={`${id}-body-hata`} mesaj={hata('body')} />
      </div>

      {/* Tuzak alan: gerçek ziyaretçi görmez ve doldurmaz, basit botlar doldurur.
          `display: none` DEĞİL, ekran dışına konumlandırma da DEĞİL — aria-hidden ve
          tabIndex ile erişilebilirlik ağacından ve klavye sırasından çıkarılıyor, böylece
          ekran okuyucu kullanıcısı da bu alana hiç rastlamıyor. autoComplete="off" şart:
          tarayıcı otomatik doldurma bunu gerçek bir alan sanıp doldurursa, gerçek
          kullanıcının mesajı sessizce yutulurdu. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor={`${id}-website`}>Bu alanı boş bırakın</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* KVKK bağlantısı <label> DIŞINDA ve yeni sekmede: etiketin içindeyken metni okumak
          için tıklamak hem onay kutusunu değiştiriyor hem aynı sekmede sayfadan ayırıyordu.
          Ziyaretçi geri döndüğünde formu baştan doldurmak zorunda kalıyordu. */}
      <div className={styles.consent}>
        <input id={`${id}-kvkk`} name="kvkkAccepted" type="checkbox" value="evet" {...alanOzellikleri('kvkkAccepted')} />
        <label htmlFor={`${id}-kvkk`}>
          Kişisel verilerimin aydınlatma metni kapsamında işlenmesini onaylıyorum.
        </label>
      </div>
      <p className={styles.consentNote}>
        <Link href="/kvkk" className="textLink" target="_blank" rel="noopener noreferrer">
          KVKK Aydınlatma Metni
          <span className={styles.visuallyHidden}> (yeni sekmede açılır)</span>
        </Link>
        {' '}— formla ilettiğiniz ad, e-posta, telefon ve mesajınızın yanı sıra IP adresiniz ve
        tarayıcı bilginiz de kayıt altına alınır.
      </p>
      <HataMetni id={`${id}-kvkkAccepted-hata`} mesaj={hata('kvkkAccepted')} />

      {/* `disabled` gönderim sırasında: çift gönderim, mesajın panelde iki kez görünmesi
          demek. aria-busy durumu yardımcı teknolojiye de bildiriyor. */}
      <button type="submit" className={styles.submit} disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Gönderiliyor…' : 'Mesajı gönder'}
      </button>
    </form>
  )
}
