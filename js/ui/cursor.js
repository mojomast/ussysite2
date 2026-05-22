let deps = {};

export function configureCursor(options = {}) {
  deps = { ...deps, ...options };
}

export function updateCursorPosition(clientX, clientY) {
  const { customCursor } = deps;
  if (!customCursor) return;
  customCursor.style.left = `${clientX}px`;
  customCursor.style.top = `${clientY}px`;
}

export function setCursorHovering(isHovering) {
  const { customCursor } = deps;
  if (!customCursor) return;
  customCursor.classList.toggle('hovering', Boolean(isHovering));
}

export function tickCustomCursor() {
  const { customCursor, isConsoleActive = () => false, isFlightActive = () => false } = deps;
  if (!customCursor) return;
  customCursor.classList.toggle('active', isConsoleActive() && !isFlightActive());
}
