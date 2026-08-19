// Depolanan göreli yolu (2026/08/<özet>.webp) servis adresine çevirir. Ayrı bir modülde
// duruyor çünkü hem sunucu bileşenleri hem istemci bileşenleri (MediaPicker) çağırıyor;
// media-storage.ts'e konsaydı sharp istemci paketine sızardı.
//
// Parçalar tek tek kodlanıyor: encodeURIComponent ayıracı da kodlar, bütün yolu tek seferde
// geçirmek "2026%2F08%2F..." üretir ve rota parçalara ayıramaz.
export function mediaUrl(relativePath: string): string {
  return `/medya/${relativePath.split('/').map(encodeURIComponent).join('/')}`
}
