'use strict';

// Loaded as a deferred classic script so opening index.html directly still works.
window.BearFeedback = Object.freeze({
  /**
   * @returns {import('./types').Feedback} */
  create() {
    const $ = (id) => document.getElementById(id);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const feedbackAnimations = new WeakMap();
    function animateFeedback(el, keyframes, options) {
      feedbackAnimations.get(el)?.cancel();
      if (reducedMotion.matches || !el.animate) return;
      feedbackAnimations.set(el, el.animate(keyframes, options));
    }

    function setFieldValidity(id, valid, message) {
      const el = $(id);
      const wasInvalid = el.getAttribute('aria-invalid') === 'true';
      if (valid) {
        el.removeAttribute('aria-invalid');
        if (wasInvalid) feedbackAnimations.get(el)?.cancel();
      } else {
        el.setAttribute('aria-invalid', 'true');
        if (!wasInvalid) {
          animateFeedback(
            el,
            [0, -4, 4, -3, 3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
            { duration: 300, easing: 'ease' },
          );
        }
      }
      el.setCustomValidity(valid ? '' : message);
    }

    function setVal(id, text) {
      const el = $(id);
      if (el.textContent === text) return;
      el.textContent = text;
      animateFeedback(
        el,
        [
          {
            transform: 'scale(.94)',
            background: 'color-mix(in srgb,var(--text-accent) 26%,transparent)',
            offset: 0,
          },
          { transform: 'scale(1.02)', offset: 0.45 },
          { transform: 'scale(1)', background: 'transparent', offset: 1 },
        ],
        { duration: 450, easing: 'ease' },
      );
    }

    function fallbackCopy(text) {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.className = 'copy-fallback';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('Copy command was rejected');
    }

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch (e) {}
      }
      fallbackCopy(text);
    }

    const copyTimers = new Map();
    function copyFeedback(button, message, ok) {
      const original = button.dataset.label || button.textContent;
      button.dataset.label = original;
      button.textContent = message;
      button.classList.toggle('copied', ok);
      $('copyStatus').textContent = message;
      clearTimeout(copyTimers.get(button));
      copyTimers.set(
        button,
        setTimeout(() => {
          button.textContent = original;
          button.classList.remove('copied');
        }, 1600),
      );
    }

    return Object.freeze({ animateFeedback, setFieldValidity, setVal, copyText, copyFeedback });
  },
});
