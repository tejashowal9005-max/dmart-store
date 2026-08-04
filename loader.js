/* ============================================================
   loader.js — Controls the loading screen behaviour
   ============================================================ */

(function() {
  'use strict';

  // ---------- Particle System ----------
  const canvas = document.getElementById('particles-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    }
    window.addEventListener('resize', resize);
    resize();

    const COUNT = 60;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 3 + 1.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * 2 * Math.PI,
        pulseSpeed: 0.01 + Math.random() * 0.02
      });
    }

    let frameId = null;
    function drawParticles() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const alpha = p.alpha * (0.8 + 0.2 * Math.sin(p.pulse));
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        gradient.addColorStop(0, `rgba(224, 165, 38, ${alpha})`);
        gradient.addColorStop(1, `rgba(224, 165, 38, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.fill();
      }
      frameId = requestAnimationFrame(drawParticles);
    }
    drawParticles();

    const observer = new MutationObserver(() => {
      const overlay = document.getElementById('loader-overlay');
      if (!overlay) {
        if (frameId) cancelAnimationFrame(frameId);
        observer.disconnect();
        window.removeEventListener('resize', resize);
      }
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  // ---------- Progress bar ----------
  const fill = document.querySelector('.loader-progress-fill');
  const percentageEl = document.querySelector('.loader-percentage');
  let startTime = null;
  const duration = 2500;

  function updateProgress(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const percent = Math.round(progress * 100);
    if (fill) fill.style.width = percent + '%';
    if (percentageEl) percentageEl.textContent = percent + '%';
    if (progress < 1) {
      requestAnimationFrame(updateProgress);
    }
  }

  function finishLoading() {
    const overlay = document.getElementById('loader-overlay');
    if (!overlay) return;
    overlay.classList.add('loader-hidden');
    const onTransitionEnd = () => {
      overlay.removeEventListener('transitionend', onTransitionEnd);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.style.overflow = '';
    };
    overlay.addEventListener('transitionend', onTransitionEnd);
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.removeEventListener('transitionend', onTransitionEnd);
        overlay.parentNode.removeChild(overlay);
      }
    }, 1000);
  }

  requestAnimationFrame(updateProgress);
  setTimeout(finishLoading, duration);
})();
