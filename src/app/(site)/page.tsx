import { Hero } from '@/components/Hero'
import { PracticeAreas } from '@/components/PracticeAreas'
import { ArticleStrip } from '@/components/ArticleStrip'
import { TeamStrip } from '@/components/TeamStrip'
import { SAMPLE_PRACTICE_AREAS, SAMPLE_ARTICLES, SAMPLE_LAWYERS } from '@/content/sample-content'

export default function HomePage() {
  return (
    <>
      <Hero />
      <PracticeAreas areas={SAMPLE_PRACTICE_AREAS} />
      <ArticleStrip articles={SAMPLE_ARTICLES} />
      <TeamStrip lawyers={SAMPLE_LAWYERS} />
    </>
  )
}
