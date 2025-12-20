function isPhoneValid(value) {
  return /^[+]?\d[\d\s-]{6,}$/.test(value);
}

function initPage() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const observedSections = document.querySelectorAll('[data-observe]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : (cb) => setTimeout(cb, 16);

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    observedSections.forEach((section) => sectionObserver.observe(section));
  } else {
    observedSections.forEach((section) => section.classList.add('reveal'));
  }

  const form = document.getElementById('contact-form');
  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('closeModal');
  const formFeedback = document.getElementById('formFeedback');
  const phoneInput = document.getElementById('phone');
  const focusableSelectors =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let lastFocusedElement = null;
  let focusableModalElements = [];

  function setFeedback(message, type = 'success') {
    if (!formFeedback) return;
    formFeedback.textContent = message;
    formFeedback.classList.remove('error', 'success');
    formFeedback.classList.add(type);
  }

  function resetFeedback() {
    if (!formFeedback) return;
    formFeedback.textContent = '';
    formFeedback.classList.remove('error', 'success');
  }

  function trapFocus(event) {
    if (!modal || !modal.classList.contains('show') || !focusableModalElements.length) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      hideModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const firstElement = focusableModalElements[0];
    const lastElement = focusableModalElements[focusableModalElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      return;
    }

    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function showModal() {
    if (!modal) return;
    lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    raf(() => {
      modal.classList.add('show');
      focusableModalElements = Array.from(modal.querySelectorAll(focusableSelectors));
      const firstElement = focusableModalElements[0];
      if (firstElement && typeof firstElement.focus === 'function') {
        firstElement.focus();
      }
    });

    document.addEventListener('keydown', trapFocus);
  }

  function hideModal() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('show');
    }, 300);
    document.removeEventListener('keydown', trapFocus);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      phoneInput.setCustomValidity('');
    });
  }

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      resetFeedback();

      if (phoneInput && !isPhoneValid(phoneInput.value.trim())) {
        phoneInput.setCustomValidity('Podaj poprawny numer telefonu.');
      }

      if (!form.reportValidity()) {
        setFeedback('Sprawdź wprowadzone dane i spróbuj ponownie.', 'error');
        return;
      }

      const formData = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        city: form.city.value.trim(),
        message: form.message.value.trim(),
        company: form.company.value.trim(),
      };

      if (formData.company) {
        form.reset();
        setFeedback('Dziękujemy! Formularz został wysłany.', 'success');
        showModal();
        return;
      }

      if (window.location.protocol === 'file:') {
        setFeedback('Dziękujemy! Formularz został wysłany.', 'success');
        form.reset();
        showModal();
        return;
      }

      fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(formData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Błąd podczas wysyłania formularza.');
          }
          return response.json();
        })
        .then(() => {
          setFeedback('Dziękujemy! Formularz został wysłany.', 'success');
          form.reset();
          showModal();
        })
        .catch((error) => {
          console.error(error);
          setFeedback(
            'Wystąpił problem z przesłaniem formularza. Spróbuj ponownie później.',
            'error'
          );
        });
    });
  }

  if (modal && closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideModal();
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        hideModal();
      }
    });
  }

  // Custom smooth scroll for navigation links (header and footer)
  const smoothScrollLinks = document.querySelectorAll(
    'header nav a[href^="#"], footer nav a[href^="#"], footer nav a[href*="#"]'
  );

  smoothScrollLinks.forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');

      // Handle links like "index.html#services" on the same page
      let targetId;
      if (href.startsWith('#')) {
        targetId = href;
      } else if (href.includes('#')) {
        // Check if we're on the same page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const linkPage = href.split('#')[0] || 'index.html';

        if (currentPage === linkPage || (linkPage === 'index.html' && currentPage === '')) {
          targetId = '#' + href.split('#')[1];
        } else {
          // Different page - let browser handle navigation
          return;
        }
      } else {
        return;
      }

      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;

      e.preventDefault();

      const header = document.querySelector('header');
      const headerOffset = header ? header.offsetHeight : 0;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 24;
      const startPosition = window.pageYOffset;
      const distance = offsetPosition - startPosition;
      const duration = 600; // 0.6 second scroll duration
      let startTime = null;

      function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
      }

      // Ease-in-out quadratic function
      function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return (c / 2) * t * t + b;
        t--;
        return (-c / 2) * (t * (t - 2) - 1) + b;
      }

      requestAnimationFrame(animation);
    });
  });

  return {
    showModal,
    hideModal,
  };
}

// ========================================
// COOKIE CONSENT (GDPR/RODO)
// ========================================

function initCookieConsent() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const cookieBanner = document.getElementById('cookieConsent');
  const acceptBtn = document.getElementById('acceptCookies');
  const rejectBtn = document.getElementById('rejectCookies');

  if (!cookieBanner) return;

  // Sprawdź czy użytkownik już dokonał wyboru
  const consent = localStorage.getItem('cookieConsent');

  if (consent === null) {
    // Brak wyboru - pokaż baner z animacją
    cookieBanner.classList.remove('hidden');
    setTimeout(() => {
      cookieBanner.classList.add('show');
    }, 500); // Opóźnienie na załadowanie strony
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
      hideCookieBanner();
      // Włącz analitykę jeśli potrzebne
      enableAnalytics();
    });
  }

  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'rejected');
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
      hideCookieBanner();
      // Wyłącz analitykę jeśli potrzebne
      disableAnalytics();
    });
  }

  function hideCookieBanner() {
    cookieBanner.classList.remove('show');
    setTimeout(() => {
      cookieBanner.classList.add('hidden');
    }, 400);
  }
}

function enableAnalytics() {
  // Włączanie cookies analitycznych
  // Dodaj Google Analytics, Facebook Pixel itp. tutaj gdy potrzebne
  console.log('Cookies analityczne włączone');
}

function disableAnalytics() {
  // Wyłączanie/usuwanie cookies analitycznych
  // Usuń cookies śledzące tutaj gdy zaimplementowane
  console.log('Cookies analityczne wyłączone');
}

// Funkcja sprawdzająca aktualny status zgody
function getCookieConsent() {
  return localStorage.getItem('cookieConsent');
}

// Funkcja resetująca zgodę (przydatne do testów lub strony ustawień)
function resetCookieConsent() {
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookieConsentDate');
  const cookieBanner = document.getElementById('cookieConsent');
  if (cookieBanner) {
    cookieBanner.classList.remove('hidden');
    setTimeout(() => {
      cookieBanner.classList.add('show');
    }, 100);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initPage();
    initCookieConsent();
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    isPhoneValid,
    initPage,
    initCookieConsent,
    getCookieConsent,
    resetCookieConsent,
  };
}
