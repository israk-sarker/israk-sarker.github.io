document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // Screenshot tab switcher
  const img = document.getElementById('ssImg');
  document.querySelectorAll('.ss-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ss-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (img) {
        img.style.opacity = '0.3';
        setTimeout(() => {
          img.src = tab.dataset.img;
          img.style.opacity = '1';
        }, 120);
      }
    });
  });

});
