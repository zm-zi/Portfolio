document.addEventListener('DOMContentLoaded', () => {
  // ===== Hero entrance animation =====
  const heroItems = [
    { el: document.querySelector('.hero__avatar'), delay: 0 },
    { el: document.querySelector('.hero__name'), delay: 200 },
    { el: document.querySelector('.hero__alias'), delay: 350 },
    { el: document.querySelector('.hero__divider'), delay: 500 },
  ];

  // Statements stagger individually
  const statements = document.querySelectorAll('.hero__statement');
  statements.forEach((el, i) => {
    heroItems.push({ el, delay: 650 + i * 200 });
  });

  heroItems.forEach(({ el, delay }) => {
    if (!el) return;
    setTimeout(() => {
      el.classList.add('animate-in');
    }, delay);
  });

  // Show scroll indicator after hero animation
  const scroll = document.querySelector('.hero__scroll');
  if (scroll) {
    setTimeout(() => {
      scroll.style.opacity = '0.5';
      scroll.style.transition = 'opacity 0.6s ease';
    }, 1800);
  }

  // ===== Glow animation =====
  const glows = document.querySelectorAll('.hero__glow');
  const glowBase = [
    { x: 0, y: 0, speedX: 0.15, speedY: 0.1, phaseX: 0, phaseY: Math.PI * 0.5 },
    { x: 0, y: 0, speedX: 0.12, speedY: 0.18, phaseX: Math.PI, phaseY: 0 },
    { x: 0, y: 0, speedX: 0.1, speedY: 0.13, phaseX: Math.PI * 0.3, phaseY: Math.PI * 0.7 },
  ];

  let mouseX = 0;
  let mouseY = 0;
  let animFrame;

  function animateGlow(timestamp) {
    const t = timestamp * 0.001;
    glows.forEach((glow, i) => {
      const base = glowBase[i];
      const autoX = Math.sin(t * base.speedX + base.phaseX) * 30;
      const autoY = Math.cos(t * base.speedY + base.phaseY) * 20;
      const parallaxX = mouseX * (8 + i * 4);
      const parallaxY = mouseY * (6 + i * 3);
      glow.style.transform = `translate(${autoX + parallaxX}px, ${autoY + parallaxY}px)`;
    });
    animFrame = requestAnimationFrame(animateGlow);
  }

  if (glows.length) {
    animFrame = requestAnimationFrame(animateGlow);
  }

  // Cancel rAF when tab is hidden to save resources
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrame);
    } else if (glows.length) {
      animFrame = requestAnimationFrame(animateGlow);
    }
  });

  // Mouse parallax (subtle)
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // ===== Navigation =====
  const nav = document.getElementById('nav');

  // Delayed fade-in
  if (nav) {
    setTimeout(() => {
      nav.classList.add('nav--visible');
    }, 1000);

    // Scroll state
    window.addEventListener('scroll', () => {
      if (window.scrollY > 80) {
        nav.classList.add('nav--scrolled');
      } else {
        nav.classList.remove('nav--scrolled');
      }
    }, { passive: true });
  }

  // ===== Mobile menu toggle =====
  const navToggle = document.querySelector('.nav__toggle');
  const navLinks = document.querySelector('.nav__links');

  function closeMenu() {
    if (navToggle && navLinks) {
      navToggle.classList.remove('nav__toggle--open');
      navLinks.classList.remove('nav__links--open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.classList.toggle('nav__toggle--open');
      navLinks.classList.toggle('nav__links--open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) closeMenu();
    });
  }

  // ===== Project toggle (collapsible) =====
  document.querySelectorAll('.project__toggle:not(.project__footer-collapse-btn):not(.design-idea__collapse-btn)').forEach(btn => {
    // Support both project__inner and design-idea__inner
    const parent = btn.closest('.project__inner') || btn.closest('.design-idea__inner');
    const details = parent?.querySelector('.project__details');
    if (!details) return;

    // For design-idea, also get the section element
    const designIdeaSection = btn.closest('.design-idea');

    // Set initial collapsed state for design-idea
    if (designIdeaSection) {
      designIdeaSection.classList.add('is-collapsed');
    }

    // Set initial height based on expanded state
    if (btn.classList.contains('is-expanded')) {
      details.style.setProperty('--details-height', details.scrollHeight + 'px');
      details.classList.add('is-expanded');
      parent.classList.add('is-expanded');
      // Show floating collapse button for initially expanded projects
      const floatingBtn = parent.querySelector('.project__footer-collapse-btn');
      if (floatingBtn) floatingBtn.classList.add('is-floating');
      btn.classList.add('is-hidden');
    } else {
      details.style.setProperty('--details-height', '0px');
    }

    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isExpanded));

      if (isExpanded) {
        // Collapse: first set explicit height, then animate to 0
        const currentHeight = details.scrollHeight;
        details.style.setProperty('--details-height', currentHeight + 'px');
        // Use rAF to ensure browser registers the starting height before animating
        requestAnimationFrame(() => {
          details.style.setProperty('--details-height', '0px');
        });
        details.classList.remove('is-expanded');
        parent.classList.remove('is-expanded');

        // Hide floating collapse button after animation completes
        const floatingBtn = parent.querySelector('.project__footer-collapse-btn');
        if (floatingBtn) {
          floatingBtn.classList.remove('is-visible');
          setTimeout(() => {
            floatingBtn.classList.remove('is-floating');
          }, 500);
        }

        // Show header toggle
        btn.classList.remove('is-hidden');

        // Add collapsed class for design-idea
        if (designIdeaSection) {
          designIdeaSection.classList.add('is-collapsed');
        }
      } else {
        // Expand: calculate full height and set it
        const fullHeight = details.scrollHeight;
        details.style.setProperty('--details-height', fullHeight + 'px');
        details.classList.add('is-expanded');
        parent.classList.add('is-expanded');

        // Show floating collapse button
        const floatingBtn = parent.querySelector('.project__footer-collapse-btn');
        if (floatingBtn) {
          floatingBtn.classList.add('is-floating');
          floatingBtn.classList.add('is-visible');
        }

        // Hide header toggle
        btn.classList.add('is-hidden');

        // Remove collapsed class for design-idea
        if (designIdeaSection) {
          designIdeaSection.classList.remove('is-collapsed');
        }

        // Trigger reveal animations for newly visible elements
        details.querySelectorAll('.reveal:not(.visible)').forEach(el => {
          el.classList.add('visible');
        });

        // Recalculate height after lazy-loaded images finish loading
        details.querySelectorAll('img[loading="lazy"]').forEach(img => {
          if (!img.complete) {
            img.addEventListener('load', () => {
              if (details.classList.contains('is-expanded')) {
                // Store actual height so future expand/collapse animations work
                const savedMaxHeight = details.style.maxHeight;
                details.style.maxHeight = 'none';
                const fullHeight = details.scrollHeight;
                details.style.setProperty('--details-height', fullHeight + 'px');
                details.style.maxHeight = savedMaxHeight;
              }
            }, { once: true });
          }
        });
      }
    });
  });

  // ===== Floating button visibility (show only when project is in view) =====
  const floatingObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const parent = entry.target.closest('.project__inner') || entry.target.closest('.design-idea__inner');
      const floatingBtn = parent?.querySelector('.project__footer-collapse-btn');
      if (!floatingBtn) return;

      if (entry.isIntersecting && entry.target.classList.contains('is-expanded')) {
        floatingBtn.classList.add('is-visible');
      } else if (!entry.isIntersecting) {
        floatingBtn.classList.remove('is-visible');
      }
    });
  }, { threshold: 0.05, rootMargin: '-64px 0px 0px 0px' });

  document.querySelectorAll('.project__details, .design-idea__details').forEach(details => {
    floatingObserver.observe(details);
  });

  // ===== Bottom collapse buttons =====
  document.querySelectorAll('.project__footer-collapse-btn, .design-idea__collapse-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.project__inner') || btn.closest('.design-idea__inner');
      const details = parent?.querySelector('.project__details');
      const headerToggle = parent?.querySelector('.project__header .project__toggle');
      if (!details || !parent) return;

      // Directly collapse the content
      const currentHeight = details.scrollHeight;
      details.style.setProperty('--details-height', currentHeight + 'px');
      requestAnimationFrame(() => {
        details.style.setProperty('--details-height', '0px');
      });
      details.classList.remove('is-expanded');
      parent.classList.remove('is-expanded');

      // Keep floating button visible during collapse animation, remove after
      btn.classList.remove('is-visible');
      setTimeout(() => {
        btn.classList.remove('is-floating');
      }, 500);

      // Show header toggle and sync its aria-expanded state
      if (headerToggle) {
        headerToggle.classList.remove('is-hidden');
        headerToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // ===== Scroll reveal for project sections =====
  const revealEls = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealEls.forEach(el => {
    // Skip elements inside collapsed project details
    const details = el.closest('.project__details');
    if (details && !details.classList.contains('is-expanded')) {
      // Still observe, but they won't be visible until expanded
      return;
    }
    observer.observe(el);
  });

  // ===== Lightbox =====
  const lightbox = document.getElementById('lightbox');
  let closeLightbox = () => {};
  if (lightbox) {
    const lightboxImg = lightbox.querySelector('.lightbox__img');
    const lightboxClose = lightbox.querySelector('.lightbox__close');

    function openLightbox(el) {
      if (lightboxImg) lightboxImg.src = el.dataset.src;
      lightbox.classList.add('lightbox--open');
      document.body.style.overflow = 'hidden';
      // Trap focus in lightbox
      if (lightboxClose) lightboxClose.focus();
    }

    document.querySelectorAll('.project__screenshot, .art__item, .asset-gallery__item').forEach(el => {
      // Make elements keyboard accessible
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');

      // Click handler
      el.addEventListener('click', () => openLightbox(el));

      // Keyboard handler
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(el);
        }
      });
    });

    closeLightbox = () => {
      lightbox.classList.remove('lightbox--open');
      document.body.style.overflow = '';
    };

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // Trap focus within lightbox when open
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && lightbox.classList.contains('lightbox--open')) {
        // Keep focus on close button
        e.preventDefault();
        if (lightboxClose) lightboxClose.focus();
      }
    });
  }

  // ===== Asset Gallery =====
  const assetGallery = document.getElementById('assetGallery');
  const openAssetsBtn = document.getElementById('openAssets');
  const closeAssetsBtn = document.getElementById('closeAssets');

  let assetImagesLoaded = false;
  function openAssetGallery() {
    if (!assetGallery) return;
    if (!assetImagesLoaded) {
      assetGallery.querySelectorAll('.asset-gallery__item img[data-src]').forEach(img => {
        img.src = img.dataset.src;
      });
      assetImagesLoaded = true;
    }
    assetGallery.classList.add('asset-gallery--open');
    document.body.style.overflow = 'hidden';
  }

  function closeAssetGallery() {
    if (!assetGallery) return;
    assetGallery.classList.remove('asset-gallery--open');
    document.body.style.overflow = '';
  }

  if (openAssetsBtn) openAssetsBtn.addEventListener('click', openAssetGallery);
  if (closeAssetsBtn) closeAssetsBtn.addEventListener('click', closeAssetGallery);
  if (assetGallery) {
    assetGallery.addEventListener('click', (e) => {
      if (e.target === assetGallery) closeAssetGallery();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      closeLightbox();
      closeAssetGallery();
    }
  });
});
