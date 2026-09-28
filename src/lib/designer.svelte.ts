// Whether this visitor says they're a designer: asked once, remembered in localStorage,
// and sent with every vote so the rankings can be split by it. null = not asked yet.

const KEY = 'poster-voter:designer';

function read(): boolean | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'yes' ? true : v === 'no' ? false : null;
  } catch {
    return null;
  }
}

class Designer {
  value = $state<boolean | null>(read());

  set(isDesigner: boolean) {
    this.value = isDesigner;
    try {
      localStorage.setItem(KEY, isDesigner ? 'yes' : 'no');
    } catch {
      // Asked again next visit; fine.
    }
  }
}

export const designer = new Designer();
