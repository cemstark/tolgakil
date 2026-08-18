// Geçici yer tutucu — tasarım Görev 4'te uygulanacak, burada yalnızca derlemenin
// ve test araç zincirinin geçmesi için create-next-app şablonu sadeleştirildi.
// `<main>` artık Görev 3'te layout.tsx tarafından sarılıyor; burada tekrar
// `<main>` açmak iç içe landmark'a (geçersiz DOM/a11y) yol açardı.
export default function Home() {
  return <p>Akıl Hukuk Bürosu</p>;
}
