'use client'

import { useActionState, useId } from 'react'
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

export function ContactForm({ action }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(action, BASLANGIC)
  // Alan kimlikleri bileşen örneğine özgü: sayfada ikinci bir form çizilirse label'lar
  // yanlış alana bağlanmasın.
  const id = useId()

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
          {...alanOzellikleri('name')}
        />
        <HataMetni id={`${id}-name-hata`} mesaj={hata('name')} />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={`${id}-email`}>E-posta</label>
          <input
            id={`${id}-email`} name="email" type="email" required autoComplete="email"
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
            {...alanOzellikleri('phone')}
          />
          <HataMetni id={`${id}-phone-hata`} mesaj={hata('phone')} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-subject`}>Konu</label>
        <input
          id={`${id}-subject`} name="subject" type="text" required
          {...alanOzellikleri('subject')}
        />
        <HataMetni id={`${id}-subject-hata`} mesaj={hata('subject')} />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-body`}>Mesajınız</label>
        <textarea
          id={`${id}-body`} name="body" rows={7} required
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

      <div className={styles.consent}>
        <input id={`${id}-kvkk`} name="kvkkAccepted" type="checkbox" value="evet" {...alanOzellikleri('kvkkAccepted')} />
        <label htmlFor={`${id}-kvkk`}>
          <Link href="/kvkk" className="textLink">KVKK Aydınlatma Metni</Link>’ni okudum, kişisel
          verilerimin bu kapsamda işlenmesini onaylıyorum.
        </label>
      </div>
      <HataMetni id={`${id}-kvkkAccepted-hata`} mesaj={hata('kvkkAccepted')} />

      {/* `disabled` gönderim sırasında: çift gönderim, mesajın panelde iki kez görünmesi
          demek. aria-busy durumu yardımcı teknolojiye de bildiriyor. */}
      <button type="submit" className={styles.submit} disabled={isPending} aria-busy={isPending}>
        {isPending ? 'Gönderiliyor…' : 'Mesajı gönder'}
      </button>
    </form>
  )
}
