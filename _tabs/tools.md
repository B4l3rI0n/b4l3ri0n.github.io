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
</script>