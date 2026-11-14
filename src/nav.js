export const go = (id) => { if (location.hash.slice(1) === id) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = id; };
