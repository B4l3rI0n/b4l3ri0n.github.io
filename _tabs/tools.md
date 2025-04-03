---
icon: fas fa-tools
order: 3
layout: page
title: "Tools"
description: "My own created tools"
---

<style>
  #tools-list {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 20px;
    justify-content: space-between;
    width: 100%;
  }

  .tool-card {
    background-color: #f7f7f7;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s;
    flex: 1 1 calc(50% - 10px);
    max-width: calc(50% - 10px);
    min-width: 300px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border: 1px solid #e0e0e0;
  }

  .tool-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    background-color: #ffffff;
  }

  .tool-card:focus-within {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  .tool-card h3 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 1.2em;
    font-weight: 600;
  }

  .tool-card h3 a {
    color: #007bff;
    text-decoration: none;
    transition: color 0.2s ease;
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
    background-color: #e0e0e0;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 5px;
    vertical-align: middle;
  }

  #filter-input {
    padding: 8px 12px;
    width: 100%;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  #filter-input:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
    border-color: #007bff;
  }

  .tool-icon {
    margin-right: 8px;
  }

  .icon-docker { color: #0db7ed; }
  .icon-js { color: #f0db4f; }
  .icon-python { color: #306998; }
  .icon-ruby { color: #cc342d; }
  .icon-java { color: #b07219; }
  .icon-html { color: #e34c26; }
  .icon-css { color: #264de4; }
  .icon-php { color: #777bb4; }
  .icon-powershell { color: #012456; }
  .icon-default { color: #007bff; }

  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid #ccc;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 10px;
    vertical-align: middle;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  #back-to-top {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
  }

  #back-to-top.visible {
    opacity: 1;
    visibility: visible;
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

<input type="text" id="filter-input" placeholder="Filter tools by name..." aria-label="Filter tools by name" />

<div id="tools-list">
  <p><span class="spinner"></span>Loading tools...</p>
  <p id="no-results" style="display: none;">No tools found matching your search.</p>
</div>

<button id="back-to-top" title="Back to Top">
  <i class="fas fa-arrow-up"></i>
</button>

<script>
  const languageIcons = {
    "JavaScript":   { icon: "fab fa-js-square", style: "icon-js" },
    "JS":           { icon: "fab fa-js-square", style: "icon-js" },
    "TypeScript":   { icon: "fab fa-js-square", style: "icon-js" },
    "Python":       { icon: "fab fa-python", style: "icon-python" },
    "Flask":        { icon: "fas fa-flask", style: "icon-python" },
    "Ruby":         { icon: "fas fa-gem", style: "icon-ruby" },
    "Docker":       { icon: "fab fa-docker", style: "icon-docker" },
    "Java":         { icon: "fab fa-java", style: "icon-java" },
    "HTML":         { icon: "fab fa-html5", style: "icon-html" },
    "CSS":          { icon: "fab fa-css3-alt", style: "icon-css" },
    "PHP":          { icon: "fab fa-php", style: "icon-php" },
    "Shell":        { icon: "fas fa-terminal", style: "icon-default" },
    "Bash":         { icon: "fas fa-terminal", style: "icon-default" },
    "PowerShell":   { icon: "fas fa-terminal", style: "icon-powershell" },
    ".NET":         { icon: "fas fa-code", style: "icon-default" },
    "C#":           { icon: "fas fa-code", style: "icon-default" },
    "Go":           { icon: "fas fa-code-branch", style: "icon-default" }
  };

  // Function to center the last card if odd
  function centerLastCard(cards) {
    const visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
    visibleCards.forEach((card, index) => {
      if (index === visibleCards.length - 1 && visibleCards.length % 2 !== 0) {
        card.style.marginLeft = 'auto';
        card.style.marginRight = 'auto';
      } else {
        card.style.marginLeft = '0';
        card.style.marginRight = '0';
      }
    });
  }

  async function loadTools() {
    const toolsList = document.getElementById('tools-list');
    const cacheKey = 'github_repos_cache';
    const cacheExpiration = 60 * 60 * 1000; // 1 hour in milliseconds

    // Check if cached data exists and is still valid
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(`${cacheKey}_time`);
    const now = new Date().getTime();

    if (cachedData && cachedTime && (now - cachedTime) < cacheExpiration) {
      const repos = JSON.parse(cachedData);
      renderTools(repos);
      return;
    }

    try {
      const response = await fetch('https://api.github.com/users/B4l3rI0n/repos');
      const repos = await response.json();

      // Cache the response
      localStorage.setItem(cacheKey, JSON.stringify(repos));
      localStorage.setItem(`${cacheKey}_time`, now.toString());

      renderTools(repos);
    } catch (error) {
      toolsList.innerHTML = "<p>Failed to load tools.</p>";
      console.error("Error fetching repositories:", error);
    }

    function renderTools(repos) {
      toolsList.innerHTML = "";
      const noResults = document.createElement('p');
      noResults.id = 'no-results';
      noResults.style.display = 'none';
      noResults.innerText = 'No tools found matching your search.';
      toolsList.appendChild(noResults);

      if (Array.isArray(repos) && repos.length > 0) {
        repos.forEach(repo => {
          const lang = repo.language;
          let iconData = languageIcons[lang] || { icon: "fas fa-code", style: "icon-default" };

          const repoHTML = `
            <div role="article" aria-labelledby="tool-${repo.name}">
              <h3 id="tool-${repo.name}">
                <i class="${iconData.icon} tool-icon ${iconData.style}"></i>
                <a href="${repo.html_url}" target="_blank">${repo.name}</a>
                ${lang ? `<span class="language-badge">${lang}</span>` : ''}
              </h3>
              <div class="description-container">
                <p class="tool-description">${repo.description ? repo.description : "No description provided."}</p>
              </div>
            </div>
          `;

          const repoCard = document.createElement('div');
          repoCard.className = 'tool-card';
          repoCard.innerHTML = repoHTML;
          toolsList.appendChild(repoCard);
        });

        // Center the last card if odd after initial render
        const cards = document.querySelectorAll('.tool-card');
        centerLastCard(cards);
      } else {
        toolsList.innerHTML = "<p>No tools found.</p>";
      }
    }
  }

  function filterTools() {
    const filterValue = document.getElementById('filter-input').value.toLowerCase();
    const cards = document.querySelectorAll('.tool-card');
    const noResults = document.getElementById('no-results');
    let visibleCount = 0;

    cards.forEach(card => {
      const title = card.querySelector('h3').innerText.toLowerCase();
      if (title.includes(filterValue)) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    noResults.style.display = visibleCount === 0 ? 'block' : 'none';

    // Center the last card if odd after filtering
    centerLastCard(cards);
  }

  document.getElementById('filter-input').addEventListener('input', filterTools);

  // Back to Top button functionality
  const backToTopButton = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopButton.classList.add('visible');
    } else {
      backToTopButton.classList.remove('visible');
    }
  });

  backToTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  loadTools();
</script>

<!-- ---
icon: fas fa-tools
order: 3
layout: page
title: "Tools"
description: "My own created tools"
---

<style>
  #tools-list {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 20px;
    justify-content: space-between; /* Spread cards across the row */
    width: 100%; /* Ensure it takes the full width of the container */
  }

  .tool-card {
    background-color: #f7f7f7;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    flex: 1 1 calc(50% - 10px); /* Two cards per row with gap adjustment */
    max-width: calc(50% - 10px); /* Ensure two cards per row */
    min-width: 300px; /* Minimum width to prevent cards from being too narrow */
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  /* Center the last card if it's the only one in the row (odd number) */
  .tool-card:last-child:nth-child(odd) {
    margin-left: auto;
    margin-right: auto;
  }

  .tool-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }

  .tool-card h3 {
    margin: 0 0 10px 0;
    color: #333;
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
    -webkit-line-clamp: 3; /* Limit to 3 lines */
    -webkit-box-orient: vertical;
    line-height: 1.5em; /* Adjust based on font size for consistent line height */
  }

  #filter-input {
    padding: 8px 12px;
    width: 100%;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .tool-icon {
    margin-right: 8px;
  }

  .icon-docker { color: #0db7ed; }
  .icon-js { color: #f0db4f; }
  .icon-python { color: #306998; }
  .icon-ruby { color: #cc342d; }
  .icon-java { color: #b07219; }
  .icon-html { color: #e34c26; }
  .icon-css { color: #264de4; }
  .icon-php { color: #777bb4; }
  .icon-powershell { color: #012456; }
  .icon-default { color: #007bff; }
</style>

<h2><i class="fas fa-tools"></i> Tools</h2>
<p>
  Check out my GitHub repository for a complete list of my public tools:
  <a href="https://github.com/B4l3rI0n?tab=repositories" target="_blank">B4l3rI0n</a>
</p>
<p>
  Below is a dynamically generated list of my tools. You can use the filter box to quickly search for a specific tool.
</p>

<input type="text" id="filter-input" placeholder="Filter tools by name..." />

<div id="tools-list">
  <p>Loading tools...</p>
</div>

<script>
  const languageIcons = {
    "JavaScript":   { icon: "fab fa-js-square", style: "icon-js" },
    "JS":           { icon: "fab fa-js-square", style: "icon-js" },
    "TypeScript":   { icon: "fab fa-js-square", style: "icon-js" },
    "Python":       { icon: "fab fa-python", style: "icon-python" },
    "Flask":        { icon: "fas fa-flask", style: "icon-python" },
    "Ruby":         { icon: "fas fa-gem", style: "icon-ruby" },
    "Docker":       { icon: "fab fa-docker", style: "icon-docker" },
    "Java":         { icon: "fab fa-java", style: "icon-java" },
    "HTML":         { icon: "fab fa-html5", style: "icon-html" },
    "CSS":          { icon: "fab fa-css3-alt", style: "icon-css" },
    "PHP":          { icon: "fab fa-php", style: "icon-php" },
    "Shell":        { icon: "fas fa-terminal", style: "icon-default" },
    "Bash":         { icon: "fas fa-terminal", style: "icon-default" },
    "PowerShell":   { icon: "fas fa-terminal", style: "icon-powershell" },
    ".NET":         { icon: "fas fa-code", style: "icon-default" },
    "C#":           { icon: "fas fa-code", style: "icon-default" },
    "Go":           { icon: "fas fa-code-branch", style: "icon-default" }
  };

  async function loadTools() {
    try {
      const response = await fetch('https://api.github.com/users/B4l3rI0n/repos');
      const repos = await response.json();
      const toolsList = document.getElementById('tools-list');
      toolsList.innerHTML = "";

      if (Array.isArray(repos) && repos.length > 0) {
        repos.forEach(repo => {
          const lang = repo.language;
          let iconData = languageIcons[lang] || { icon: "fas fa-code", style: "icon-default" };

          const repoHTML = `
            <h3>
              <i class="${iconData.icon} tool-icon ${iconData.style}"></i>
              <a href="${repo.html_url}" target="_blank">${repo.name}</a>
            </h3>
            <div class="description-container">
              <p class="tool-description">${repo.description ? repo.description : "No description provided."}</p>
            </div>
          `;

          const repoCard = document.createElement('div');
          repoCard.className = 'tool-card';
          repoCard.innerHTML = repoHTML;
          toolsList.appendChild(repoCard);
        });
      } else {
        toolsList.innerHTML = "<p>No tools found.</p>";
      }
    } catch (error) {
      document.getElementById('tools-list').innerHTML = "<p>Failed to load tools.</p>";
      console.error("Error fetching repositories:", error);
    }
  }

  function filterTools() {
    const filterValue = document.getElementById('filter-input').value.toLowerCase();
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const title = card.querySelector('h3').innerText.toLowerCase();
      card.style.display = title.includes(filterValue) ? 'flex' : 'none';
    });

    // Re-center the last card if it's the only one in the row after filtering
    const visibleCards = Array.from(cards).filter(card => card.style.display !== 'none');
    visibleCards.forEach((card, index) => {
      if (index === visibleCards.length - 1 && visibleCards.length % 2 !== 0) {
        card.style.marginLeft = 'auto';
        card.style.marginRight = 'auto';
      } else {
        card.style.marginLeft = '0';
        card.style.marginRight = '0';
      }
    });
  }
  
  document.getElementById('filter-input').addEventListener('input', filterTools);
  loadTools();
</script> -->






<!-- 
---
icon: fas fa-tools
order: 3
layout: page
title: "Tools"
description: "My own created tools"
---

<style>
  /* Container styling */
  #tools-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  /* Card styling */
  .tool-card {
    background-color: #f7f7f7;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .tool-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }

  .tool-card h3 {
    margin-top: 0;
    color: #333;
  }

  /* Description container with slide-down/up effect */
  .description-container {
    position: relative;
    overflow: hidden;
    max-height: 80px; /* Collapsed height */
    transition: max-height 0.5s ease;
  }
  .description-container.expanded {
    max-height: 1000px; /* Expanded height */
  }

  .tool-description {
    font-size: 0.9em;
    color: #666;
    margin: 0;
  }

  /* Toggle button styling: just an icon, centered, black */
  .toggle-description {
    display: none;
    margin: 10px auto 0;
    background: none;
    border: none;
    cursor: pointer;
    color: #000;
    font-size: 1.2em;
  }

  /* Filter input styling */
  #filter-input {
    padding: 8px 12px;
    width: 100%;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  /* Icon styling for tool icons */
  .tool-icon {
    margin-right: 8px;
  }
  .icon-docker { color: #0db7ed; }
  .icon-js { color: #f0db4f; }
  .icon-python { color: #306998; }
  .icon-ruby { color: #cc342d; }
  .icon-java { color: #b07219; }
  .icon-html { color: #e34c26; }
  .icon-css { color: #264de4; }
  .icon-php { color: #777bb4; }
  .icon-powershell { color: #012456; }
  .icon-default { color: #007bff; }
</style>

<h2><i class="fas fa-tools"></i>&nbsp; Tools</h2>
<p>
  Check out my GitHub repository for a complete list of my public tools:
  <a href="https://github.com/B4l3rI0n?tab=repositories" target="_blank">B4l3rI0n</a>
</p>
<p>
  Below is a dynamically generated list of my tools. You can use the filter box to quickly search for a specific tool.
</p>

<input type="text" id="filter-input" placeholder="Filter tools by name..." />

<div id="tools-list">
  <p>Loading tools...</p>
</div>

<script>
  const languageIcons = {
    "JavaScript":   { icon: "fab fa-js-square", style: "icon-js" },
    "JS":           { icon: "fab fa-js-square", style: "icon-js" },
    "TypeScript":   { icon: "fab fa-js-square", style: "icon-js" },
    "Python":       { icon: "fab fa-python", style: "icon-python" },
    "Flask":        { icon: "fas fa-flask", style: "icon-python" },
    "Ruby":         { icon: "fas fa-gem", style: "icon-ruby" },
    "Docker":       { icon: "fab fa-docker", style: "icon-docker" },
    "Java":         { icon: "fab fa-java", style: "icon-java" },
    "HTML":         { icon: "fab fa-html5", style: "icon-html" },
    "CSS":          { icon: "fab fa-css3-alt", style: "icon-css" },
    "PHP":          { icon: "fab fa-php", style: "icon-php" },
    "Shell":        { icon: "fas fa-terminal", style: "icon-default" },
    "Bash":         { icon: "fas fa-terminal", style: "icon-default" },
    "PowerShell":   { icon: "fas fa-terminal", style: "icon-powershell" },
    ".NET":         { icon: "fas fa-code", style: "icon-default" },
    "C#":           { icon: "fas fa-code", style: "icon-default" },
    "Go":           { icon: "fas fa-code-branch", style: "icon-default" }
  };

  async function loadTools() {
    try {
      const response = await fetch('https://api.github.com/users/B4l3rI0n/repos');
      const repos = await response.json();
      const toolsList = document.getElementById('tools-list');
      toolsList.innerHTML = "";

      if (Array.isArray(repos) && repos.length > 0) {
        repos.forEach(repo => {
          const lang = repo.language;
          let iconData = languageIcons[lang] || { icon: "fas fa-code", style: "icon-default" };

          const repoHTML = `
            <h3>
              <i class="${iconData.icon} tool-icon ${iconData.style}"></i>
              <a href="${repo.html_url}" target="_blank">${repo.name}</a>
            </h3>
            <div class="description-container">
              <p class="tool-description">${repo.description ? repo.description : "No description provided."}</p>
              <button class="toggle-description"><i class="fas fa-chevron-down"></i></button>
            </div>
          `;

          const repoCard = document.createElement('div');
          repoCard.className = 'tool-card';
          repoCard.innerHTML = repoHTML;
          toolsList.appendChild(repoCard);

          const descriptionContainer = repoCard.querySelector('.description-container');
          const description = repoCard.querySelector('.tool-description');
          const toggle = repoCard.querySelector('.toggle-description');

          if (description.innerText.length > 80) {
            toggle.style.display = 'block';
            toggle.addEventListener('click', () => {
              descriptionContainer.classList.toggle('expanded');
              // Change icon based on state
              if (descriptionContainer.classList.contains('expanded')) {
                toggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
              } else {
                toggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
              }
            });
          } else {
            descriptionContainer.classList.add('expanded');
            toggle.style.display = 'none';
          }
        });
      } else {
        toolsList.innerHTML = "<p>No tools found.</p>";
      }
    } catch (error) {
      document.getElementById('tools-list').innerHTML = "<p>Failed to load tools.</p>";
      console.error("Error fetching repositories:", error);
    }
  }

  function filterTools() {
    const filterValue = document.getElementById('filter-input').value.toLowerCase();
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const title = card.querySelector('h3').innerText.toLowerCase();
      card.style.display = title.includes(filterValue) ? 'block' : 'none';
    });
  }
  
  document.getElementById('filter-input').addEventListener('input', filterTools);
  loadTools();
</script>
 -->

