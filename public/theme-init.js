// Apply the saved theme before styles paint; an external script respects the production CSP.
try {
  const saved = localStorage.getItem('herculito-theme');
  const themes = ['dark', 'midnight', 'forest', 'amethyst', 'cocoa', 'carbon', 'aurora',
    'light', 'ocean', 'sage', 'lavender', 'sand', 'rose', 'snow'];
  document.documentElement.dataset.theme = themes.includes(saved) ? saved : 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}
