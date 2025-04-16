---
icon: fas fa-tools
order: 3
layout: page
title: "Tools"
description: "My own created tools"
---

<style>
  #tools-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  .tool-card {
    background-color: #f7f7f7;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .tool-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    background-color: #fff;
  }
  .tool-card:focus-within {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  .tool-card h3 {
    margin: 0 0 10px;
    font-size: 1.2em;
    font-weight: 600;
    color: #333;
  }
  .tool-card h3 a {
    color: #007bff;
    text-decoration: none;
    transition: color 0.2s;
  }
  .tool-card h3 a:hover {
    color: #0056b3;
    text-decoration: underline;
  }

  .description-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }
  .tool-description {
    font-size: 0.9em;
    color: #666;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    line-height: 1.6em;
    transition: opacity 0.3s;
  }
  .tool-description.lazy-load {
    opacity: 0.3;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  .tool-description.loaded {
    opacity: 1;
    background: none;
    animation: none;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .language-badge {
    display: inline-block;
    font-size: 0.75em;
    color: #666;
    background: #e0e0e0;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 5px;
    vertical-align: middle;
  }

  .controls-container {
    max-width: 600px;
    margin: 0 auto 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    align-items: center;
  }
  .filter-container {
    position: relative;
    flex: 1;
    min-width: 200px;
  }
  #filter-input {
    width: 100%;
    padding: 12px 40px 12px 16px;
    border: none;
    border-radius: 25px;
    background-color: #f0f0f0;
    font-size: 1em;
    transition: background-color 0.3s, box-shadow 0.3s;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
  }
  #filter-input:focus {
    background-color: #fff;
    box-shadow: 0 0 8px rgba(0,123,255,0.3);
    outline: none;
  }

  #clear-filter {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    font-size: 1em;
    color: #777;
    cursor: pointer;
    padding: 5px;
    display: none;
    transition: color 0.2s;
  }
  #clear-filter:hover {
    color: #007bff;
  }
  #clear-filter.visible {
    display: block;
  }

  .sort-container {
    flex: 0 0 auto;
    min-width: 200px;
    display: flex;
    align-items: center;
  }
  .sort-container label {
    font-size: 0.9em;
    color: #333;
    margin-right: 8px;
    display: inline-block;
    vertical-align: middle;
  }
  #sort-tools {
    width: 150px; /* Increased width for arrow space */
    padding: 10px 30px 10px 14px; /* Adjusted padding to ensure arrow has space */
    border: none;
    border-radius: 25px;
    background-color: #f0f0f0;
    font-size: 0.9em;
    transition: background-color 0.3s, box-shadow 0.3s;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    vertical-align: middle;
    appearance: none; /* Remove default browser styling */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }
  #sort-tools:focus {
    background-color: #fff;
    box-shadow: 0 0 8px rgba(0,123,255,0.3);
    outline: none;
  }

  .center-card {
    grid-column: 1 / -1;
    justify-self: center;
    max-width: 500px;
  }

  .tool-icon { margin-right: 8px; }
  .icon-docker   { color: #0db7ed; }
  .icon-js       { color: #f0db4f; }
  .icon-python   { color: #306998; }
  .icon-ruby     { color: #cc342d; }
  .icon-java     { color: #b07219; }
  .icon-html     { color: #e34c26; }
  .icon-css      { color: #264de4; }
  .icon-php      { color: #777bb4; }
  .icon-powershell { color: #012456; }
  .icon-default  { color: #007bff; }

  .spinner { display: none; }

  #back-to-top {
    position: fixed; bottom: 20px; right: 20px;
    width: 40px; height: 40px;
    background: #007bff; color: #fff;
    border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; opacity: 0; visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
  }
  #back-to-top.visible {
    opacity: 1; visibility: visible;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>

<h2><i class="fas fa-tools"></i> Tools</h2>
<p>
  Check out my GitHub repository for a complete list of my public tools:
  <a href="https://github.com/B4l3rI0n?tab=repositories" target="_blank">B4l3rI0n</a>
</p>
<p>
  Below is a dynamically generated list of my tools. You can use the filter box to quickly search for a specific tool or sort them by different criteria.
</p>

<div class="controls-container">
  <div class="filter-container">
    <input type="text" id="filter-input" placeholder="Search tools…" aria-label="Filter tools by name" />
    <button id="clear-filter" aria-label="Clear filter">
      <i class="fas fa-times"></i>
    </button>
  </div>
  <div class="sort-container">
    <label for="sort-tools">Sort by:</label>
    <select id="sort-tools" aria-label="Sort tools">
      <option value="name-asc">Name (A-Z)</option>
      <option value="name-desc">Name (Z-A)</option>
      <option value="language">Language</option>
    </select>
  </div>
</div>

<div id="filter-status" aria-live="polite" class="visually-hidden"></div>

<div id="tools-list">
  {% assign repos = site.data.repos %}
  {% assign total = repos | size %}
  {% assign last_index = total | minus: 1 %}
  {% assign odd = total | modulo: 2 %}

  {% if total > 0 %}
    {% for repo in repos %}
      {% assign extra_class = "" %}
      {% if forloop.index0 == last_index and odd == 1 %}
        {% assign extra_class = "center-card" %}
      {% endif %}

      {% assign lang = repo.language | default: "default" %}
      {% assign iconData = site.data.language_icons[lang] | default: site.data.language_icons.default %}

      <div class="tool-card {{ extra_class }}" role="article" aria-labelledby="tool-{{ repo.name }}" tabindex="0">
        <h3 id="tool-{{ repo.name }}">
          <i class="{{ iconData.icon }} tool-icon {{ iconData.style }}"></i>
          <a href="{{ repo.html_url }}" target="_blank">{{ repo.name }}</a>
          {% if repo.language %}
            <span class="language-badge">{{ repo.language }}</span>
          {% endif %}
        </h3>
        <div class="description-container">
          <p class="tool-description lazy-load" data-description="{{ repo.description | default: 'No description provided.' | escape }}">
            Loading description...
          </p>
        </div>
      </div>
    {% endfor %}
  {% else %}
    <p>No tools found.</p>
  {% endif %}
</div>

<button id="back-to-top" title="Back to Top">
  <i class="fas fa-arrow-up"></i>
</button>

<script>
  function filterTools() {
    const q = document.getElementById('filter-input').value.toLowerCase();
    const cards = document.querySelectorAll('.tool-card');
    let visible = 0;
    cards.forEach(c => {
      const title = c.querySelector('h3').innerText.toLowerCase();
      if (title.includes(q)) {
        c.style.display = 'flex';
        visible++;
      } else {
        c.style.display = 'none';
      }
      c.classList.remove('center-card');
    });

    // Update ARIA live region
    const status = document.getElementById('filter-status');
    status.textContent = `${visible} tool${visible === 1 ? '' : 's'} found.`;

    if (!visible) {
      if (!document.getElementById('no-results')) {
        const msg = document.createElement('p');
        msg.id = 'no-results';
        msg.textContent = 'No tools found matching your search.';
        document.getElementById('tools-list').append(msg);
      }
    } else {
      const nr = document.getElementById('no-results');
      if (nr) nr.remove();
    }

    // Apply center-card class to the last visible card if odd
    const visibleCards = Array.from(cards).filter(c => c.style.display !== 'none');
    if (visibleCards.length % 2 === 1) {
      visibleCards[visibleCards.length - 1].classList.add('center-card');
    }

    // Update clear button visibility
    const clearBtn = document.getElementById('clear-filter');
    clearBtn.classList.toggle('visible', filterInput.value.length > 0);
  }

  function sortTools() {
    const sortValue = document.getElementById('sort-tools').value;
    const cards = Array.from(document.querySelectorAll('.tool-card'));
    const container = document.getElementById('tools-list');

    cards.sort((a, b) => {
      const aName = a.querySelector('h3').innerText.toLowerCase();
      const bName = b.querySelector('h3').innerText.toLowerCase();
      const aLang = a.querySelector('.language-badge')?.textContent.toLowerCase() || '';
      const bLang = b.querySelector('.language-badge')?.textContent.toLowerCase() || '';

      if (sortValue === 'name-asc') return aName.localeCompare(bName);
      if (sortValue === 'name-desc') return bName.localeCompare(aName);
      if (sortValue === 'language') {
        return aLang === bLang ? aName.localeCompare(bName) : aLang.localeCompare(bLang);
      }
      return 0;
    });

    // Re-append sorted cards
    container.innerHTML = '';
    cards.forEach(card => container.appendChild(card));

    // Re-apply filter and centering
    filterTools();
  }

  function lazyLoadDescriptions() {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const desc = entry.target;
          desc.textContent = desc.dataset.description;
          desc.classList.remove('lazy-load');
          desc.classList.add('loaded');
          obs.unobserve(desc);
        }
      });
    }, { rootMargin: '100px' });

    document.querySelectorAll('.tool-description.lazy-load').forEach(desc => observer.observe(desc));
  }

  // Event listeners
  const filterInput = document.getElementById('filter-input');
  const clearBtn = document.getElementById('clear-filter');

  filterInput.addEventListener('input', filterTools);

  clearBtn.addEventListener('click', () => {
    filterInput.value = '';
    filterTools();
    clearBtn.classList.remove('visible');
    filterInput.focus();
  });

  document.getElementById('sort-tools').addEventListener('change', sortTools);

  const btn = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    window.scrollY > 300 ? btn.classList.add('visible') : btn.classList.remove('visible');
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Initialize lazy loading
  document.addEventListener('DOMContentLoaded', lazyLoadDescriptions);

  // Handle keyboard navigation for cards
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.querySelector('h3 a')?.click();
      }
    });
  });
</script>