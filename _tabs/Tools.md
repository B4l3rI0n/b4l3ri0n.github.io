---
icon: fas fa-tools
order: 3
layout: page
title: "Tools"
description: "My own created tools"
---

<style>
  :root {
    --card-bg: #f7f7f7;
    --card-border: #e0e0e0;
    --text-primary: #333;
    --text-secondary: #666;
    --link-color: #007bff;
    --link-hover: #0056b3;
    --badge-bg: #e0e0e0;
    --shadow-light: rgba(0,0,0,0.1);
    --shadow-hover: rgba(0,0,0,0.15);
    --input-bg: #f0f0f0;
    --input-bg-focus: #fff;
    --input-shadow: rgba(0,123,255,0.3);
  }

  [theme="dark"] {
    --card-bg: #333;
    --card-border: #4a4a4a;
    --text-primary: #e0e0e0;
    --text-secondary: #b0b0b0;
    --link-color: #4a90e2;
    --link-hover: #99ccff;
    --badge-bg: #555;
    --shadow-light: rgba(0,0,0,0.3);
    --shadow-hover: rgba(0,0,0,0.4);
    --input-bg: #3a3a3a;
    --input-bg-focus: #444;
    --input-shadow: rgba(102,176,255,0.3);
  }

  #tools-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  .tool-card {
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 5px var(--shadow-light);
    transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer; /* Indicate the card is clickable */
  }
  .tool-card.hidden {
    display: none;
  }
  .tool-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px var(--shadow-hover);
    background-color: var(--card-bg);
  }
  .tool-card:focus-within {
    outline: 2px solid var(--link-color);
    outline-offset: 2px;
  }

  .tool-card h3 {
    margin: 0 0 10px;
    font-size: 1.2em;
    font-weight: 600;
    color: var(--text-primary);
  }
  .tool-card h3 a {
    color: var(--link-color);
    text-decoration: none;
    transition: color 0.2s;
  }
  .tool-card h3 a:hover {
    color: var(--link-hover);
    text-decoration: underline;
  }

  .description-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }
  .tool-description {
    font-size: 0.9em;
    color: var(--text-secondary);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    line-height: 1.6em;
  }

  .language-badge {
    display: inline-block;
    font-size: 0.75em;
    color: var(--text-primary);
    background: var(--badge-bg);
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
    background-color: var(--input-bg);
    font-size: 1em;
    color: var(--text-primary);
    transition: background-color 0.3s, box-shadow 0.3s;
    box-shadow: inset 0 1px 3px var(--shadow-light);
  }
  #filter-input:focus {
    background-color: var(--input-bg-focus);
    box-shadow: 0 0 8px var(--input-shadow);
    outline: none;
  }
  #filter-input::placeholder {
    color: var(--text-secondary);
  }

  #clear-filter {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    font-size: 1em;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 5px;
    display: none;
    transition: color 0.2s;
  }
  #clear-filter:hover {
    color: var(--link-color);
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
    color: var(--text-primary);
    margin-right: 8px;
    display: inline-block;
    vertical-align: middle;
  }
  #sort-tools {
    width: 130px;
    padding: 10px 30px 10px 14px;
    border: none;
    border-radius: 25px;
    background-color: var(--input-bg);
    font-size: 0.9em;
    color: var(--text-primary);
    transition: background-color 0.3s, box-shadow 0.3s;
    box-shadow: inset 0 1px 3px var(--shadow-light);
    vertical-align: middle;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='var(--text-secondary)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }
  #sort-tools:focus {
    background-color: var(--input-bg-focus);
    box-shadow: 0 0 8px var(--input-shadow);
    outline: none;
  }

  #load-more {
    text-align: center;
    padding: 20px;
    font-size: 1em;
    color: var(--text-secondary);
  }
  #load-more.hidden {
    display: none;
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
  .icon-default  { color: var(--link-color); }

  .spinner { display: none; }

  #back-to-top {
    position: fixed; bottom: 20px; right: 20px;
    width: 40px; height: 40px;
    background: var(--link-color); color: #fff;
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

<!-- Debug: Log the repos data to verify it's available -->
<p id="debug-repos" style="display: none;">
  {{ site.data.repos | inspect }}
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
          <p class="tool-description">
            {{ repo.description | default: 'No description provided.' | escape }}
          </p>
        </div>
      </div>
    {% endfor %}
  {% else %}
    <p>No tools found.</p>
  {% endif %}
</div>

<div id="load-more">Loading more tools...</div>

<button id="back-to-top" title="Back to Top">
  <i class="fas fa-arrow-up"></i>
</button>

<script>
  // Inline IntersectionObserver polyfill to avoid CSP issues
  (function() {
    if (!('IntersectionObserver' in window)) {
      window.IntersectionObserver = class IntersectionObserver {
        constructor(callback, options) {
          this.callback = callback;
          this.options = options;
          this.elements = new Set();
        }
        observe(element) {
          this.elements.add(element);
          // Fallback: Trigger callback immediately for simplicity
          this.callback([{ isIntersecting: true, target: element }]);
        }
        unobserve(element) {
          this.elements.delete(element);
        }
        disconnect() {
          this.elements.clear();
        }
      };
    }
  })();

  const ITEMS_PER_BATCH = 6; // Number of tools to load per batch
  let allCards = [];
  let visibleCards = [];
  let currentBatch = 0;

  function filterTools() {
    try {
      const filterInput = document.getElementById('filter-input');
      if (!filterInput) {
        console.error('Filter input element not found');
        return;
      }

      const q = filterInput.value.toLowerCase();
      allCards = Array.from(document.querySelectorAll('.tool-card'));
      visibleCards = [];
      let visible = 0;

      allCards.forEach(c => {
        const title = c.querySelector('h3').innerText.toLowerCase();
        if (title.includes(q)) {
          visibleCards.push(c);
          visible++;
        } else {
          c.classList.add('hidden');
        }
        c.classList.remove('center-card');
      });

      console.log(`Filtered ${visible} tools with query "${q}"`);

      // Update ARIA live region
      const status = document.getElementById('filter-status');
      if (status) {
        status.textContent = `${visible} tool${visible === 1 ? '' : 's'} found.`;
      }

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

      // Reset infinite scroll
      currentBatch = 0;
      loadMoreTools();

      // Update clear button visibility
      const clearBtn = document.getElementById('clear-filter');
      if (clearBtn) {
        clearBtn.classList.toggle('visible', filterInput.value.length > 0);
      }
    } catch (error) {
      console.error('Error in filterTools:', error);
    }
  }

  function sortTools() {
    try {
      const sortSelect = document.getElementById('sort-tools');
      if (!sortSelect) {
        console.error('Sort select element not found');
        return;
      }

      const sortValue = sortSelect.value;
      const container = document.getElementById('tools-list');
      if (!container) {
        console.error('Tools list container not found');
        return;
      }

      const cards = Array.from(document.querySelectorAll('.tool-card'));
      if (!cards.length) {
        console.warn('No tool cards found for sorting');
        return;
      }

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

      console.log(`Sorted tools by ${sortValue}`);

      // Re-append sorted cards
      container.innerHTML = '';
      cards.forEach(card => container.appendChild(card));

      // Re-apply filter and infinite scroll
      filterTools();
    } catch (error) {
      console.error('Error in sortTools:', error);
    }
  }

  function loadMoreTools() {
    try {
      const start = currentBatch * ITEMS_PER_BATCH;
      const end = Math.min(start + ITEMS_PER_BATCH, visibleCards.length);

      // Hide all cards first
      allCards.forEach(c => c.classList.add('hidden'));

      // Show cards up to the current batch
      for (let i = 0; i < end; i++) {
        visibleCards[i].classList.remove('hidden');
      }

      // Apply center-card class to the last visible card if odd
      const shownCards = visibleCards.slice(0, end);
      if (shownCards.length % 2 === 1) {
        shownCards[shownCards.length - 1].classList.add('center-card');
      }

      // Hide "Load More" if all cards are shown
      const loadMore = document.getElementById('load-more');
      if (loadMore) {
        if (end >= visibleCards.length) {
          loadMore.classList.add('hidden');
        } else {
          loadMore.classList.remove('hidden');
        }
      }

      console.log(`Loaded batch ${currentBatch}: Showing ${end} of ${visibleCards.length} tools`);

      // Announce loaded items for accessibility
      const status = document.getElementById('filter-status');
      if (status) {
        status.textContent = `Showing ${end} of ${visibleCards.length} tool${visibleCards.length === 1 ? '' : 's'}.`;
      }
    } catch (error) {
      console.error('Error in loadMoreTools:', error);
    }
  }

  function setupInfiniteScroll() {
    try {
      const loadMore = document.getElementById('load-more');
      if (!loadMore) {
        console.error('Load More element not found');
        return;
      }

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && currentBatch * ITEMS_PER_BATCH < visibleCards.length) {
            currentBatch++;
            loadMoreTools();
          }
        });
      }, { rootMargin: '200px' });

      observer.observe(loadMore);

      // Fallback: If the observer doesn't trigger within 2 seconds, manually check
      setTimeout(() => {
        const rect = loadMore.getBoundingClientRect();
        const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (isInViewport && currentBatch * ITEMS_PER_BATCH < visibleCards.length) {
          currentBatch++;
          loadMoreTools();
        }
      }, 2000);

      console.log('Infinite scroll observer set up');
    } catch (error) {
      console.error('Error in setupInfiniteScroll:', error);
    }
  }

  function initialize() {
    try {
      // Debug: Log the repos data
      const debugRepos = document.getElementById('debug-repos');
      if (debugRepos) {
        console.log('site.data.repos:', debugRepos.textContent);
      } else {
        console.warn('Debug repos element not found');
      }

      // Initialize cards
      allCards = Array.from(document.querySelectorAll('.tool-card'));
      if (allCards.length === 0) {
        console.warn('No tool cards found in the DOM');
      } else {
        console.log(`Found ${allCards.length} tool cards`);
      }

      // Set up filter input event listener
      const filterInput = document.getElementById('filter-input');
      if (filterInput) {
        filterInput.addEventListener('input', filterTools);
        console.log('Filter input event listener attached');
      } else {
        console.error('Filter input element not found during initialization');
      }

      // Set up clear filter button event listener
      const clearBtn = document.getElementById('clear-filter');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (filterInput) {
            filterInput.value = '';
            filterTools();
            clearBtn.classList.remove('visible');
            filterInput.focus();
          }
        });
        console.log('Clear filter button event listener attached');
      } else {
        console.error('Clear filter button not found');
      }

      // Set up sort select event listener
      const sortSelect = document.getElementById('sort-tools');
      if (sortSelect) {
        sortSelect.addEventListener('change', sortTools);
        console.log('Sort select event listener attached');
      } else {
        console.error('Sort select element not found during initialization');
      }

      // Set up click and keyboard navigation for cards
      allCards.forEach(card => {
        // Click event
        card.addEventListener('click', () => {
          const link = card.querySelector('h3 a');
          if (link) {
            window.open(link.href, '_blank');
          }
        });

        // Keyboard event (Enter or Space)
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const link = card.querySelector('h3 a');
            if (link) {
              window.open(link.href, '_blank');
            }
          }
        });
      });
      console.log('Card click and keyboard event listeners attached');

      // Set up back to top button
      const backToTopBtn = document.getElementById('back-to-top');
      if (backToTopBtn) {
        window.addEventListener('scroll', () => {
          window.scrollY > 300 ? backToTopBtn.classList.add('visible') : backToTopBtn.classList.remove('visible');
        });
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        console.log('Back to top button event listeners attached');
      } else {
        console.error('Back to top button not found');
      }

      // Initial filter and infinite scroll setup
      filterTools();
      setupInfiniteScroll();
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }

  // Use window.onload to ensure all resources are loaded
  window.onload = () => {
    console.log('Window loaded, initializing...');
    initialize();
  };

  // Fallback: If window.onload doesn't fire, try DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, checking if initialization is needed...');
    if (!allCards.length) {
      initialize();
    }
  });
</script>