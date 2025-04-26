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

  #filter-input {
    width: 100%;
    padding: 8px 12px;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  #filter-input:focus {
    outline: 2px solid #007bff;
    border-color: #007bff;
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
</style>

<h2><i class="fas fa-tools"></i> Tools</h2>
<p>
  Check out my GitHub repository for a complete list of my public tools:
  <a href="https://github.com/B4l3rI0n?tab=repositories" target="_blank">B4l3rI0n</a>
</p>
<p>
  Below is a dynamically generated list of my tools. You can use the filter box to quickly search for a specific tool.
</p>

<input type="text" id="filter-input" placeholder="Filter tools by name…" aria-label="Filter tools by name" />

<div id="tools-list">
  {% assign repos  = site.data.repos %}
  {% assign total  = repos | size %}
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

      <div class="tool-card {{ extra_class }}" role="article" aria-labelledby="tool-{{ repo.name }}">
        <h3 id="tool-{{ repo.name }}">
          <i class="{{ iconData.icon }} tool-icon {{ iconData.style }}"></i>
          <a href="{{ repo.html_url }}" target="_blank">{{ repo.name }}</a>
          {% if repo.language %}
            <span class="language-badge">{{ repo.language }}</span>
          {% endif %}
        </h3>
        <div class="description-container">
          <p class="tool-description">
            {{ repo.description | default: "No description provided." }}
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
      // Remove center-card class from all cards
      c.classList.remove('center-card');
    });
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
  }
  document.getElementById('filter-input').addEventListener('input', filterTools);

  const btn = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    window.scrollY > 300 ? btn.classList.add('visible') : btn.classList.remove('visible');
  });
  btn.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
</script>
