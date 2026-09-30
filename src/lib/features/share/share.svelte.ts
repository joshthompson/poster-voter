// Sharing a link through the device's share menu, or copying it where there isn't one.
// `copied` is true for a moment after a link was copied, so the button can say so.

const COPIED_MS = 2000;

export class LinkSharer {
  copied = $state(false);
  #timer: ReturnType<typeof setTimeout> | undefined;

  async share(url: string, title: string) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      // Closing the menu without picking anything is fine. Otherwise there's no share menu here
      // (calling the missing navigator.share threw) or it failed: copy the link instead.
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      console.error(e);
      return;
    }
    this.copied = true;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => (this.copied = false), COPIED_MS);
  }
}
