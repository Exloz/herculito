// Apply the saved theme before styles paint; an external script respects the production CSP.
try {
  document.documentElement.dataset.theme = localStorage.getItem('herculito-theme') === 'light'
    ? 'light'
    : 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}
