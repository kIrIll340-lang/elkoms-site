(() => {
  'use strict';

  const projects = Array.isArray(window.ELKOMS_PROJECTS) ? window.ELKOMS_PROJECTS : [];

  const track = document.querySelector('#project-track');
  const viewport = document.querySelector('#project-viewport');
  const dots = document.querySelector('#project-dots');
  const prevButton = document.querySelector('#projects-prev');
  const nextButton = document.querySelector('#projects-next');
  const tabs = [...document.querySelectorAll('.project-tab')];

  const galleryDialog = document.querySelector('#gallery-dialog');
  const galleryTitle = document.querySelector('#gallery-title');
  const galleryImage = document.querySelector('#gallery-image');
  const galleryCounter = document.querySelector('#gallery-counter');
  const galleryThumbs = document.querySelector('#gallery-thumbs');
  const galleryPrev = document.querySelector('#gallery-prev');
  const galleryNext = document.querySelector('#gallery-next');
  const galleryClose = document.querySelector('#gallery-close');
  const galleryStage = document.querySelector('#gallery-stage');

  const requestDialog = document.querySelector('#request-dialog');
  const requestClose = document.querySelector('#request-close');
  const requestForm = document.querySelector('#request-form');
  const formStatus = document.querySelector('#form-status');
  const requestOpeners = [...document.querySelectorAll('.js-open-request')];
  const formStartedAt = document.querySelector('#form-started-at');

  const privacyDialog = document.querySelector('#privacy-dialog');
  const privacyClose = document.querySelector('#privacy-close');
  const privacyOpen = document.querySelector('#open-privacy');
  const privacyFromForm = document.querySelector('#privacy-from-form');

  let activeCategory = 'commercial';
  let activeProject = null;
  let activeImageIndex = 0;
  let galleryTouchStartX = 0;
  let galleryTouchStartY = 0;

  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function filteredProjects() {
    return projects.filter((project) => project.category === activeCategory);
  }

  function renderProjects() {
    if (!track) return;

    const items = filteredProjects();
    track.innerHTML = items.map((project) => `
      <button class="project-card" type="button" data-project-id="${escapeHtml(project.id)}" aria-label="Открыть фотографии объекта: ${escapeHtml(project.title)}">
        <img src="${escapeHtml(project.preview)}" alt="${escapeHtml(project.title)}" width="900" height="600" loading="lazy" decoding="async">
        <span class="project-card-overlay" aria-hidden="true"></span>
        <span class="project-card-title">${escapeHtml(project.title)}</span>
      </button>
    `).join('');

    track.querySelectorAll('.project-card').forEach((card) => {
      card.addEventListener('click', () => {
        const project = projects.find((item) => item.id === card.dataset.projectId);
        if (project) openGallery(project);
      });
    });

    requestAnimationFrame(() => {
      viewport.scrollTo({ left: 0, behavior: 'instant' });
      renderProjectDots();
      updateCarouselButtons();
    });
  }

  function cardStep() {
    const firstCard = track?.querySelector('.project-card');
    if (!firstCard) return 0;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0');
    return firstCard.getBoundingClientRect().width + gap;
  }

  function maxScrollLeft() {
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  }

  function currentPageIndex() {
    const step = cardStep();
    if (!step) return 0;
    return Math.round(viewport.scrollLeft / step);
  }

  function renderProjectDots() {
    if (!dots || !viewport) return;
    const step = cardStep();
    const totalPages = step ? Math.max(1, Math.round(maxScrollLeft() / step) + 1) : 1;
    const current = Math.min(currentPageIndex(), totalPages - 1);

    dots.innerHTML = Array.from({ length: totalPages }, (_, index) => `
      <button class="carousel-dot${index === current ? ' is-active' : ''}" type="button" aria-label="Показать карточку ${index + 1}" data-page="${index}"></button>
    `).join('');

    dots.querySelectorAll('.carousel-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        viewport.scrollTo({ left: Number(dot.dataset.page) * step, behavior: 'smooth' });
      });
    });
  }

  function updateProjectDots() {
    const allDots = [...dots.querySelectorAll('.carousel-dot')];
    if (!allDots.length) return;
    const current = Math.min(currentPageIndex(), allDots.length - 1);
    allDots.forEach((dot, index) => dot.classList.toggle('is-active', index === current));
  }

  function updateCarouselButtons() {
    const max = maxScrollLeft();
    prevButton.disabled = viewport.scrollLeft <= 4;
    nextButton.disabled = viewport.scrollLeft >= max - 4;
  }

  function scrollProjects(direction) {
    const step = cardStep();
    viewport.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activeCategory = tab.dataset.category;
      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-selected', String(isActive));
      });
      renderProjects();
    });
  });

  prevButton?.addEventListener('click', () => scrollProjects(-1));
  nextButton?.addEventListener('click', () => scrollProjects(1));
  viewport?.addEventListener('scroll', () => {
    window.requestAnimationFrame(() => {
      updateProjectDots();
      updateCarouselButtons();
    });
  }, { passive: true });

  viewport?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') scrollProjects(-1);
    if (event.key === 'ArrowRight') scrollProjects(1);
  });

  window.addEventListener('resize', () => {
    renderProjectDots();
    updateCarouselButtons();
  });

  function setGalleryImage(index) {
    if (!activeProject) return;
    const total = activeProject.images.length;
    activeImageIndex = (index + total) % total;
    const source = activeProject.images[activeImageIndex];

    galleryImage.classList.add('is-changing');
    const preloader = new Image();
    preloader.onload = () => {
      galleryImage.src = source;
      galleryImage.alt = `${activeProject.title}, фотография ${activeImageIndex + 1}`;
      galleryCounter.textContent = `${activeImageIndex + 1} / ${total}`;
      galleryImage.classList.remove('is-changing');
      updateGalleryThumbs();
      preloadGalleryNeighbors();
    };
    preloader.onerror = () => {
      galleryImage.classList.remove('is-changing');
    };
    preloader.src = source;
  }

  function preloadGalleryNeighbors() {
    if (!activeProject || activeProject.images.length < 2) return;
    const total = activeProject.images.length;
    [activeImageIndex - 1, activeImageIndex + 1].forEach((index) => {
      const image = new Image();
      image.src = activeProject.images[(index + total) % total];
    });
  }

  function renderGalleryThumbs() {
    galleryThumbs.innerHTML = activeProject.images.map((src, index) => `
      <button class="gallery-thumb${index === activeImageIndex ? ' is-active' : ''}" type="button" data-image-index="${index}" aria-label="Открыть фотографию ${index + 1}">
        <img src="${escapeHtml(src)}" alt="" width="92" height="64" loading="lazy">
      </button>
    `).join('');

    galleryThumbs.querySelectorAll('.gallery-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => setGalleryImage(Number(thumb.dataset.imageIndex)));
    });
  }

  function updateGalleryThumbs() {
    const thumbs = [...galleryThumbs.querySelectorAll('.gallery-thumb')];
    thumbs.forEach((thumb, index) => thumb.classList.toggle('is-active', index === activeImageIndex));
    thumbs[activeImageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function openGallery(project) {
    activeProject = project;
    activeImageIndex = 0;
    galleryTitle.textContent = project.title;
    renderGalleryThumbs();
    setGalleryImage(0);
    galleryDialog.showModal();
    document.documentElement.classList.add('dialog-open');
    galleryClose.focus();
  }

  function closeGallery() {
    if (galleryDialog.open) galleryDialog.close();
    activeProject = null;
    document.documentElement.classList.remove('dialog-open');
  }

  galleryPrev?.addEventListener('click', () => setGalleryImage(activeImageIndex - 1));
  galleryNext?.addEventListener('click', () => setGalleryImage(activeImageIndex + 1));
  galleryClose?.addEventListener('click', closeGallery);

  galleryDialog?.addEventListener('click', (event) => {
    if (event.target === galleryDialog) closeGallery();
  });

  galleryDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeGallery();
  });

  galleryStage?.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    galleryTouchStartX = touch.clientX;
    galleryTouchStartY = touch.clientY;
  }, { passive: true });

  galleryStage?.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    const diffX = touch.clientX - galleryTouchStartX;
    const diffY = touch.clientY - galleryTouchStartY;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      setGalleryImage(activeImageIndex + (diffX < 0 ? 1 : -1));
    }
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (!galleryDialog.open) return;
    if (event.key === 'ArrowLeft') setGalleryImage(activeImageIndex - 1);
    if (event.key === 'ArrowRight') setGalleryImage(activeImageIndex + 1);
  });

  function openRequestDialog() {
    formStatus.textContent = '';
    formStartedAt.value = String(Date.now());
    requestDialog.showModal();
    document.documentElement.classList.add('dialog-open');
    requestDialog.querySelector('input[name="name"]')?.focus();
  }

  function closeRequestDialog() {
    if (requestDialog.open) requestDialog.close();
    document.documentElement.classList.remove('dialog-open');
  }

  requestOpeners.forEach((button) => button.addEventListener('click', openRequestDialog));
  requestClose?.addEventListener('click', closeRequestDialog);
  requestDialog?.addEventListener('click', (event) => {
    if (event.target === requestDialog) closeRequestDialog();
  });
  requestDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeRequestDialog();
  });

  requestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!requestForm.checkValidity()) {
      requestForm.reportValidity();
      return;
    }

    const submitButton = requestForm.querySelector('button[type="submit"]');
    const originalText = submitButton.querySelector('span').textContent;
    submitButton.disabled = true;
    submitButton.querySelector('span').textContent = 'Отправляем…';
    formStatus.className = 'form-status';
    formStatus.textContent = '';

    try {
      const response = await fetch(requestForm.action, {
        method: 'POST',
        body: new FormData(requestForm),
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Не удалось отправить заявку. Позвоните нам по основному номеру.');
      }

      formStatus.className = 'form-status is-success';
      formStatus.textContent = data.message || 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.';
      requestForm.reset();
      formStartedAt.value = String(Date.now());
    } catch (error) {
      formStatus.className = 'form-status is-error';
      formStatus.textContent = error.message || 'Произошла ошибка при отправке.';
    } finally {
      submitButton.disabled = false;
      submitButton.querySelector('span').textContent = originalText;
    }
  });

  function openPrivacyDialog() {
    if (requestDialog.open) requestDialog.close();
    privacyDialog.showModal();
    document.documentElement.classList.add('dialog-open');
    privacyClose.focus();
  }

  function closePrivacyDialog() {
    if (privacyDialog.open) privacyDialog.close();
    document.documentElement.classList.remove('dialog-open');
  }

  privacyOpen?.addEventListener('click', openPrivacyDialog);
  privacyFromForm?.addEventListener('click', openPrivacyDialog);
  privacyClose?.addEventListener('click', closePrivacyDialog);
  privacyDialog?.addEventListener('click', (event) => {
    if (event.target === privacyDialog) closePrivacyDialog();
  });
  privacyDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closePrivacyDialog();
  });

  document.querySelector('#current-year').textContent = String(new Date().getFullYear());

  renderProjects();
})();
