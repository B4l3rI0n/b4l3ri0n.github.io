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