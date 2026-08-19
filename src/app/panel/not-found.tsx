import Link from 'next/link'
import { PanelHeading } from '@/components/PanelHeading'
import styles from './boundary.module.css'

// Panel kabuğunun altında çizilir: gezinme yerinde kalır, kullanıcı 404'ten sonra
// genel siteye fırlatılmaz. requireAccess() yetkisiz kaynakta buraya düşürüyor.
export default function PanelNotFound() {
  return (
    <>
      <PanelHeading title="Sayfa bulunamadı" description="Bu bölüm yok veya erişim yetkiniz bulunmuyor." />
      <Link href="/panel" className={`textLink ${styles.link}`}>Panele dön</Link>
    </>
  )
}
