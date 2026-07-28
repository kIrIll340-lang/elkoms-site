(() => {
  'use strict';

  const projects = Array.isArray(window.ELKOMS_PROJECTS)
    ? window.ELKOMS_PROJECTS
    : [];

  const track = document.querySelector('#project-track');
  const viewport = document.querySelector('#project-viewport');
  const dots = document.querySelector('#project-dots');
  const prevButton = document.querySelector('#projects-prev');
  const nextButton = document.querySelector('#projects-next');

  const galleryDialog = document.querySelector('#gallery-dialog');
  const galleryTitle = document.querySelector('#gallery-title');
  const galleryImage = document.querySelector('#gallery-image');
  const galleryCounter = document.querySelector('#gallery-counter');
  const galleryThumbs = document.querySelector('#gallery-thumbs');
  const galleryPrev = document.querySelector('#gallery-prev');
  const galleryNext = document.querySelector('#gallery-next');
  const galleryClose = document.querySelector('#gallery-close');
  const galleryStage = document.querySelector('#gallery-stage');
  const galleryShell = document.querySelector('.gallery-shell');

  const requestDialog = document.querySelector('#request-dialog');
  const requestClose = document.querySelector('#request-close');
  const requestForm = document.querySelector('#request-form');
  const formStatus = document.querySelector('#form-status');
  const requestOpeners = [...document.querySelectorAll('.js-open-request')];
  const formStartedAt = document.querySelector('#form-started-at');

  const employmentDialog = document.querySelector('#employment-dialog');
  const employmentClose = document.querySelector('#employment-close');
  const employmentOpeners = [...document.querySelectorAll('.js-open-employment')];

  const privacyDialog = document.querySelector('#privacy-dialog');
  const privacyClose = document.querySelector('#privacy-close');
  const privacyOpen = document.querySelector('#open-privacy');
  const privacyFromForm = document.querySelector('#privacy-from-form');

  const fullrekDialog = document.querySelector('#fullrek-dialog');
  const fullrekClose = document.querySelector('#fullrek-close');
  const fullrekOpeners = [
    document.querySelector('#open-fullrek-footer')
  ].filter(Boolean);

  const allDialogs = [
    galleryDialog,
    requestDialog,
    employmentDialog,
    privacyDialog,
    fullrekDialog
  ].filter(Boolean);

  let activeProject = null;
  let activeImageIndex = 0;
  let galleryTouchStartX = 0;
  let galleryTouchStartY = 0;
  let gallerySwipeHandled = false;
  let projectTouchStartX = 0;
  let projectTouchStartY = 0;
  let projectTouchStartPage = 0;
  let projectTouchMoved = false;
  let projectDotsFrame = 0;

  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function syncDialogOpenState() {
    const hasOpenDialog = allDialogs.some((dialog) => dialog.open);
    document.documentElement.classList.toggle('dialog-open', hasOpenDialog);
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
    syncDialogOpenState();
  }

  function closeOtherDialogs(exceptDialog) {
    allDialogs.forEach((dialog) => {
      if (dialog !== exceptDialog && dialog.open) dialog.close();
    });
  }

  function showDialog(dialog, focusTarget) {
    if (!dialog) return;

    closeOtherDialogs(dialog);

    if (!dialog.open) {
      dialog.showModal();
    }

    syncDialogOpenState();
    focusTarget?.focus();
  }

  function renderProjects() {
    if (!track) return;

    if (!projects.length) {
      track.innerHTML = '<p class="projects-empty">Объекты скоро появятся.</p>';
      if (dots) dots.innerHTML = '';
      if (prevButton) prevButton.disabled = true;
      if (nextButton) nextButton.disabled = true;
      return;
    }

    track.innerHTML = projects.map((project) => `
      <button
        class="project-card"
        type="button"
        data-project-id="${escapeHtml(project.id)}"
        aria-label="Открыть фотографии объекта: ${escapeHtml(project.title)}"
      >
        <img
          src="${escapeHtml(project.preview)}"
          alt="${escapeHtml(project.title)}"
          width="900"
          height="600"
          loading="lazy"
          decoding="async"
        >
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
      viewport?.scrollTo({ left: 0, behavior: 'auto' });
      renderProjectDots();
      updateCarouselButtons();
    });
  }

  function cardStep() {
    const firstCard = track?.querySelector('.project-card');
    if (!firstCard) return 0;

    const styles = getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0');

    return firstCard.getBoundingClientRect().width + gap;
  }

  function maxScrollLeft() {
    if (!viewport) return 0;
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  }

  function currentPageIndex() {
    if (!viewport) return 0;

    const step = cardStep();
    if (!step) return 0;

    return Math.round(viewport.scrollLeft / step);
  }

  function pageCount() {
    const step = cardStep();
    if (!step) return 1;

    return Math.max(1, Math.round(maxScrollLeft() / step) + 1);
  }

  function renderProjectDots() {
    if (!dots || !viewport) return;

    const totalPages = pageCount();
    const current = Math.min(currentPageIndex(), totalPages - 1);

    dots.innerHTML = Array.from({ length: totalPages }, (_, index) => `
      <button
        class="carousel-dot${index === current ? ' is-active' : ''}"
        type="button"
        aria-label="Показать объекты, страница ${index + 1}"
        data-page="${index}"
      ></button>
    `).join('');

    dots.querySelectorAll('.carousel-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const step = cardStep();
        viewport.scrollTo({
          left: Number(dot.dataset.page) * step,
          behavior: 'smooth'
        });
      });
    });
  }

  function updateProjectDots() {
    if (!dots) return;

    const allDots = [...dots.querySelectorAll('.carousel-dot')];
    if (!allDots.length) return;

    const current = Math.min(currentPageIndex(), allDots.length - 1);
    allDots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === current);
    });
  }

  function updateCarouselButtons() {
    if (!viewport) return;

    const max = maxScrollLeft();

    if (prevButton) {
      prevButton.disabled = viewport.scrollLeft <= 4;
    }

    if (nextButton) {
      nextButton.disabled = viewport.scrollLeft >= max - 4;
    }
  }

  function scrollProjects(direction) {
    if (!viewport) return;

    const step = cardStep();
    if (!step) return;

    const targetPage = Math.min(
      Math.max(currentPageIndex() + direction, 0),
      pageCount() - 1
    );

    viewport.scrollTo({
      left: targetPage * step,
      behavior: 'smooth'
    });
  }

  prevButton?.addEventListener('click', () => scrollProjects(-1));
  nextButton?.addEventListener('click', () => scrollProjects(1));

  viewport?.addEventListener('scroll', () => {
    cancelAnimationFrame(projectDotsFrame);
    projectDotsFrame = requestAnimationFrame(() => {
      updateProjectDots();
      updateCarouselButtons();
    });
  }, { passive: true });

  viewport?.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    projectTouchStartX = touch.clientX;
    projectTouchStartY = touch.clientY;
    projectTouchStartPage = currentPageIndex();
    projectTouchMoved = false;
  }, { passive: true });

  viewport?.addEventListener('touchmove', (event) => {
    const touch = event.changedTouches[0];
    const diffX = touch.clientX - projectTouchStartX;
    const diffY = touch.clientY - projectTouchStartY;

    if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
      projectTouchMoved = true;
      event.preventDefault();
    }
  }, { passive: false });

  viewport?.addEventListener('touchend', (event) => {
    const step = cardStep();
    if (!viewport || !step) return;

    const touch = event.changedTouches[0];
    const diffX = touch.clientX - projectTouchStartX;
    const diffY = touch.clientY - projectTouchStartY;
    const isHorizontalSwipe = Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY);
    const direction = diffX < 0 ? 1 : -1;
    const targetPage = isHorizontalSwipe
      ? Math.min(Math.max(projectTouchStartPage + direction, 0), pageCount() - 1)
      : projectTouchStartPage;

    viewport.scrollTo({
      left: targetPage * step,
      behavior: 'smooth'
    });

    if (projectTouchMoved) {
      window.setTimeout(() => {
        projectTouchMoved = false;
      }, 250);
    }
  }, { passive: true });

  viewport?.addEventListener('click', (event) => {
    if (!projectTouchMoved) return;

    event.preventDefault();
    event.stopPropagation();
    projectTouchMoved = false;
  }, true);

  viewport?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollProjects(-1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollProjects(1);
    }
  });

  window.addEventListener('resize', () => {
    renderProjectDots();
    updateCarouselButtons();

    if (galleryDialog?.open && galleryImage?.naturalWidth && galleryImage?.naturalHeight) {
      updateGalleryStageSize(galleryImage.naturalWidth, galleryImage.naturalHeight);
    }
  });

  function updateGalleryControls() {
    if (!activeProject) return;

    const hasMultipleImages = activeProject.images.length > 1;

    galleryPrev?.toggleAttribute('hidden', !hasMultipleImages);
    galleryNext?.toggleAttribute('hidden', !hasMultipleImages);

    if (galleryThumbs) {
      galleryThumbs.hidden = !hasMultipleImages;
    }
  }

  function updateGalleryStageSize(width, height) {
    if (!galleryStage || !width || !height) return;

    const shellRect = galleryShell?.getBoundingClientRect();
    const topbarRect = galleryShell?.querySelector('.gallery-topbar')?.getBoundingClientRect();
    const footerRect = galleryShell?.querySelector('.gallery-footer')?.getBoundingClientRect();
    const shellStyles = galleryShell ? getComputedStyle(galleryShell) : null;
    const rowGap = Number.parseFloat(shellStyles?.rowGap || shellStyles?.gap || '0') || 0;

    const maxWidth = shellRect?.width || Math.min(window.innerWidth * 0.86, 1480);
    const reservedHeight = (topbarRect?.height || 0) + (footerRect?.height || 0) + rowGap * 2;
    const maxHeight = Math.max(220, (shellRect?.height || window.innerHeight * 0.88) - reservedHeight);
    const ratio = width / height;

    let stageWidth = maxWidth;
    let stageHeight = stageWidth / ratio;

    if (stageHeight > maxHeight) {
      stageHeight = maxHeight;
      stageWidth = stageHeight * ratio;
    }

    galleryStage.style.setProperty('--gallery-stage-width', `${Math.round(stageWidth)}px`);
    galleryStage.style.setProperty('--gallery-stage-height', `${Math.round(stageHeight)}px`);
  }

  function setGalleryImage(index) {
    if (!activeProject || !galleryImage || !galleryCounter) return;

    const total = activeProject.images.length;
    if (!total) return;

    activeImageIndex = (index + total) % total;
    const source = activeProject.images[activeImageIndex];

    galleryImage.classList.add('is-changing');

    const preloader = new Image();

    preloader.onload = () => {
      updateGalleryStageSize(preloader.naturalWidth, preloader.naturalHeight);
      galleryImage.src = source;
      galleryImage.alt = `${activeProject.title}, фотография ${activeImageIndex + 1}`;
      galleryCounter.textContent = `${activeImageIndex + 1} / ${total}`;
      galleryImage.classList.remove('is-changing');
      updateGalleryThumbs();
      preloadGalleryNeighbors();
    };

    preloader.onerror = () => {
      galleryImage.classList.remove('is-changing');
      galleryImage.alt = 'Не удалось загрузить фотографию';
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
    if (!galleryThumbs || !activeProject) return;

    galleryThumbs.innerHTML = activeProject.images.map((src, index) => `
      <button
        class="gallery-thumb${index === activeImageIndex ? ' is-active' : ''}"
        type="button"
        data-image-index="${index}"
        aria-label="Открыть фотографию ${index + 1}"
      >
        <img src="${escapeHtml(src)}" alt="" width="92" height="64" loading="lazy">
      </button>
    `).join('');

    galleryThumbs.querySelectorAll('.gallery-thumb').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        setGalleryImage(Number(thumb.dataset.imageIndex));
      });
    });
  }

  function updateGalleryThumbs() {
    if (!galleryThumbs) return;

    const thumbs = [...galleryThumbs.querySelectorAll('.gallery-thumb')];

    thumbs.forEach((thumb, index) => {
      thumb.classList.toggle('is-active', index === activeImageIndex);
    });

    thumbs[activeImageIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }

  function openGallery(project) {
    if (!galleryDialog || !galleryTitle || !Array.isArray(project.images) || !project.images.length) {
      return;
    }

    activeProject = project;
    activeImageIndex = 0;
    galleryTitle.textContent = project.title;

    renderGalleryThumbs();
    updateGalleryControls();
    showDialog(galleryDialog, galleryClose);
    setGalleryImage(0);
  }

  function closeGallery() {
    closeDialog(galleryDialog);
    activeProject = null;

    if (galleryImage) {
      galleryImage.removeAttribute('src');
      galleryImage.alt = '';
    }

    galleryStage?.style.removeProperty('--gallery-stage-width');
    galleryStage?.style.removeProperty('--gallery-stage-height');
  }

  galleryPrev?.addEventListener('click', () => {
    setGalleryImage(activeImageIndex - 1);
  });

  galleryNext?.addEventListener('click', () => {
    setGalleryImage(activeImageIndex + 1);
  });

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
    gallerySwipeHandled = false;
  }, { passive: true });

  galleryStage?.addEventListener('touchmove', (event) => {
    const touch = event.changedTouches[0];
    const diffX = touch.clientX - galleryTouchStartX;
    const diffY = touch.clientY - galleryTouchStartY;

    if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
      event.preventDefault();
    }
  }, { passive: false });

  galleryStage?.addEventListener('touchend', (event) => {
    if (!activeProject || activeProject.images.length < 2 || gallerySwipeHandled) return;

    const touch = event.changedTouches[0];
    const diffX = touch.clientX - galleryTouchStartX;
    const diffY = touch.clientY - galleryTouchStartY;

    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      gallerySwipeHandled = true;
      setGalleryImage(activeImageIndex + (diffX < 0 ? 1 : -1));
    }
  }, { passive: true });

  document.addEventListener('keydown', (event) => {
    if (!galleryDialog?.open || !activeProject || activeProject.images.length < 2) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setGalleryImage(activeImageIndex - 1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setGalleryImage(activeImageIndex + 1);
    }
  });

  function openRequestDialog() {
    if (formStatus) {
      formStatus.textContent = '';
      formStatus.className = 'form-status';
    }

    if (formStartedAt) {
      formStartedAt.value = String(Date.now());
    }

    showDialog(
      requestDialog,
      requestDialog?.querySelector('input[name="name"]')
    );
  }

  function closeRequestDialog() {
    closeDialog(requestDialog);
  }

  requestOpeners.forEach((button) => {
    button.addEventListener('click', openRequestDialog);
  });

  requestClose?.addEventListener('click', closeRequestDialog);

  requestDialog?.addEventListener('click', (event) => {
    if (event.target === requestDialog) closeRequestDialog();
  });

  requestDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeRequestDialog();
  });

  function openEmploymentDialog() {
    showDialog(
      employmentDialog,
      employmentDialog?.querySelector('.employment-actions a')
    );
  }

  function closeEmploymentDialog() {
    closeDialog(employmentDialog);
  }

  employmentOpeners.forEach((button) => {
    button.addEventListener('click', openEmploymentDialog);
  });

  employmentClose?.addEventListener('click', closeEmploymentDialog);

  employmentDialog?.addEventListener('click', (event) => {
    if (event.target === employmentDialog) closeEmploymentDialog();
  });

  employmentDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeEmploymentDialog();
  });

  requestForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!requestForm.checkValidity()) {
      requestForm.reportValidity();
      return;
    }

    const submitButton = requestForm.querySelector('button[type="submit"]');
    const submitText = submitButton?.querySelector('span');
    const originalText = submitText?.textContent || 'Отправить заявку';

    if (submitButton) submitButton.disabled = true;
    if (submitText) submitText.textContent = 'Отправляем…';

    if (formStatus) {
      formStatus.className = 'form-status';
      formStatus.textContent = '';
    }

    try {
      const response = await fetch(requestForm.action, {
        method: 'POST',
        body: new FormData(requestForm),
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
          'Не удалось отправить заявку. Позвоните нам по основному номеру.'
        );
      }

      if (formStatus) {
        formStatus.className = 'form-status is-success';
        formStatus.textContent = data.message ||
          'Заявка отправлена. Мы свяжемся с вами в ближайшее время.';
      }

      requestForm.reset();

      if (formStartedAt) {
        formStartedAt.value = String(Date.now());
      }
    } catch (error) {
      if (formStatus) {
        formStatus.className = 'form-status is-error';
        formStatus.textContent = error instanceof Error
          ? error.message
          : 'Произошла ошибка при отправке.';
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
      if (submitText) submitText.textContent = originalText;
    }
  });

  function openPrivacyDialog() {
    showDialog(privacyDialog, privacyClose);
  }

  function closePrivacyDialog() {
    closeDialog(privacyDialog);
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

  function openFullrekDialog() {
    showDialog(fullrekDialog, fullrekClose);
  }

  function closeFullrekDialog() {
    closeDialog(fullrekDialog);
  }

  fullrekOpeners.forEach((button) => {
    button.addEventListener('click', openFullrekDialog);
  });

  fullrekClose?.addEventListener('click', closeFullrekDialog);

  fullrekDialog?.addEventListener('click', (event) => {
    if (event.target === fullrekDialog) closeFullrekDialog();
  });

  fullrekDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeFullrekDialog();
  });

  const currentYear = document.querySelector('#current-year');
  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }

  renderProjects();
})();
