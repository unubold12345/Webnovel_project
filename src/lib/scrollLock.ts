let openCount = 0;

export function lockScroll() {
  openCount++;
  if (openCount === 1) {
    document.body.classList.add("modalOpen");
    document.documentElement.classList.add("modalOpen");
  }
}

export function unlockScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) {
    document.body.classList.remove("modalOpen");
    document.documentElement.classList.remove("modalOpen");
  }
}
