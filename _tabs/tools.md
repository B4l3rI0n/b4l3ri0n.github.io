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

  .error-message {
    color: #d9534f;
    font-size: 0.9em;
    margin-top: 10px;
  }

  .retry-button {
    background-color: #007bff;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    margin-top: 10px;
    font-size: 0.9em;
  }

  .retry-button:hover {
    background-color: #0056b3;
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
  <p id="loading-message"><span class="spinner"></span>Loading tools...</p>
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
    const loadingMessage = document.getElementById('loading-message');
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
      // Simplified fetch request without AbortController
      const response = await fetch('https://api.github.com/users/B4l3rI0n/repos', {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      // Check for rate limit or other errors
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        } else if (response.status === 404) {
          throw new Error('GitHub user or repositories not found. Please check the username.');
        } else {
          throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
        }
      }

      const repos = await response.json();

      // Cache the response
      localStorage.setItem(cacheKey, JSON.stringify(repos));
      localStorage.setItem(`${cacheKey}_time`, now.toString());

      renderTools(repos);
    } catch (error) {
      loadingMessage.remove(); // Remove the loading spinner
      let errorMessage = 'Failed to load tools. Please try again later.';
      if (error.message) {
        errorMessage = error.message;
      }

      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <p class="error-message">${errorMessage}</p>
        <button class="retry-button" id="retry-button">Retry</button>
      `;
      toolsList.insertBefore(errorDiv, toolsList.firstChild);

      // Add event listener for retry button
      document.getElementById('retry-button').addEventListener('click', () => {
        errorDiv.remove();
        toolsList.insertBefore(loadingMessage, toolsList.firstChild);
        loadTools();
      });

      console.error("Error fetching repositories:", error);
    }

    function renderTools(repos) {
      loadingMessage.remove(); // Remove the loading spinner
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