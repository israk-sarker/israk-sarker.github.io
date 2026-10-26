document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      links.classList.toggle('open', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
    });
    const closeMenu = () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    };
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && links.classList.contains('open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  // Screenshot selector
  const img = document.getElementById('ssImg');
  const screenshotButtons = [...document.querySelectorAll('.ss-tab')];
  screenshotButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      screenshotButtons.forEach(button => {
        const selected = button === tab;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      if (img) {
        img.src = tab.dataset.img;
        img.alt = tab.dataset.alt || tab.textContent.trim();
      }
    });
  });

});
