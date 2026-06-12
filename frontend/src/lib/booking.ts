// No Indian ticketing provider (BookMyShow, District, PVR INOX) offers a public API,
// so booking is a deep link to BookMyShow search — same hand-off pattern as OTT deep links.
export function bookMyShowSearchUrl(title: string): string {
  return `https://in.bookmyshow.com/explore/home/search?q=${encodeURIComponent(title)}`
}
