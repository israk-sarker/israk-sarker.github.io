/**
 * Israk Sarker - Modern Portfolio Interaction Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. CV Modal Functionality
  // ==========================================
  const cvModalOverlay = document.getElementById('cvModalOverlay');
  const openCvButtons = document.querySelectorAll('[data-action="view-cv"]');
  const closeCvButtons = document.querySelectorAll('[data-action="close-cv"]');

  function openCvModal() {
    if (cvModalOverlay) {
      cvModalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCvModal() {
    if (cvModalOverlay) {
      cvModalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  openCvButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCvModal();
    });
  });

  closeCvButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeCvModal();
    });
  });

  // Close modal when clicking outside of .cv-modal
  if (cvModalOverlay) {
    cvModalOverlay.addEventListener('click', (e) => {
      if (e.target === cvModalOverlay) {
        closeCvModal();
      }
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cvModalOverlay && cvModalOverlay.classList.contains('active')) {
      closeCvModal();
    }
  });

  // ==========================================
  // 2. Project Category Filtering
  // ==========================================
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filterValue = button.getAttribute('data-filter');

      projectCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (filterValue === 'all' || cardCategory === filterValue) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 20);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 200);
        }
      });
    });
  });

  // ==========================================
  // 3. Veeam Showcase Screenshot Switcher
  // ==========================================
  const previewScreenImg = document.getElementById('veeamPreviewImg');
  const previewTabButtons = document.querySelectorAll('.preview-tab-btn');

  previewTabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
      previewTabButtons.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetImgSrc = tab.getAttribute('data-img');
      if (previewScreenImg && targetImgSrc) {
        previewScreenImg.style.opacity = '0.4';
        setTimeout(() => {
          previewScreenImg.src = targetImgSrc;
          previewScreenImg.style.opacity = '1';
        }, 150);
      }
    });
  });

  // ==========================================
  // 4. Mobile Navigation Toggle
  // ==========================================
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const isExpanded = navLinks.classList.contains('active');
      navToggle.setAttribute('aria-expanded', isExpanded);
    });

    // Close mobile nav when clicking any link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.setAttribute('aria-expanded', false);
      });
    });
  }

  // ==========================================
  // 5. Navbar Scroll Shadow Effect
  // ==========================================
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.style.borderBottomColor = 'rgba(99, 102, 241, 0.25)';
      navbar.style.background = 'rgba(9, 13, 22, 0.95)';
    } else {
      navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
      navbar.style.background = 'rgba(9, 13, 22, 0.85)';
    }
  });
});
