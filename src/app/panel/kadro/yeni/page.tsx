import type { Metadata } from 'next'
import { listMedia } from '@/db/queries/media'
import { requireAccess } from '@/lib/auth-guards'
import { LawyerForm } from '@/components/LawyerForm'
import { PanelHeading } from '@/components/PanelHeading'
import { saveLawyer } from '../actions'

export const metadata: Metadata = {
  title: 'Yeni avukat',
  robots: { index: false, follow: false },
}

export default async function NewLawyerPage() {
  await requireAccess('lawyers')
  const mediaOptions = await listMedia()

  return (
    <>
      <PanelHeading
        title="Yeni avukat"
        description="Kaydı önce taslak olarak bırakıp bilgileri tamamlandığında yayına alabilirsiniz."
      />
      <LawyerForm action={saveLawyer} mediaOptions={mediaOptions} />
    </>
  )
}
