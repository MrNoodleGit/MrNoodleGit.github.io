/* Ra Mour — writing.html: full essay archive from writing.md
   (js/writing-data.js). Homepage teaser lives in js/writing-home.js. */

function render(essays) {
  const list = document.getElementById("essays-list");
  essays.forEach((essay) => list.appendChild(essayItem(essay)));
  observeReveals(list);
}

listEssays()
  .then((essays) => {
    const list = document.getElementById("essays-list");
    if (!essays.length) {
      list.innerHTML = '<p class="essays-note">No essays yet — check back soon.</p>';
      return;
    }
    render(essays);
  })
  .catch(() => {
    document.getElementById("essays-list").innerHTML =
      '<p class="essays-note">The archive couldn’t be loaded right now. <a href="index.html">Back home</a>.</p>';
  });
