// assets/js/main.js
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.toggle-section');

  sections.forEach((section) => {
    section.addEventListener('click', () => {
      sections.forEach((other) => {
        if (other !== section && other.open) {
          other.open = false;
        }
      });

      if (!section.open) {
        section.style.transform = 'scale(1.02)';
        setTimeout(() => {
          section.style.transform = 'scale(1)';
        }, 200);
      }
    });
  });
});