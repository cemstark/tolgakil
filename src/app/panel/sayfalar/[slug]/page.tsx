import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/db/queries/pages'
import { isPageSlug } from '@/db/schema'
import { requireAccess } from '@/lib/auth-guards'
import { PanelActionLink } from '@/components/PanelActionLink'
import { PanelHeading } from '@/components/PanelHeading'
import { PageContentForm } from '@/components/PageContentForm'
import { savePage } from '../actions'

export const metadata: Metadata = {
  title: 'Sayfa metnini düzenle',
  robots: { index: false, follow: false },
}

type EditPageProps = { params: Promise<{ slug: string }> }

export default async function EditPagePage({ params }: EditPageProps) {
  await requireAccess('pages')

  const { slug } = await params
  // Adres kullanıcı verisi; sabit listede olmayan slug forma dönüşmez.
  if (!isPageSlug(slug)) notFound()

  const page = await getPageBySlug(slug)
  if (page === null) notFound()

  return (
    <>
      <PanelHeading title="Sayfa metnini düzenle" description={`Adres: /${slug}`} />

      <PageContentForm
        action={savePage}
        values={{ slug, title: page.title, content: page.content }}
        secondaryAction={<PanelActionLink href="/panel/sayfalar">Listeye dön</PanelActionLink>}
      />
    </>
  )
}
