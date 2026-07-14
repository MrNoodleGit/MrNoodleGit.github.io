/* Ra Mour — writing.html: full essay archive from writing.md
   (js/writing-data.js). Homepage teaser lives in js/writing-home.js. */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function essayItem({ title, date, url, excerpt }) {
  const item = document.createElement("li");
  item.className = "essays__item reveal";

  const inner = document.createElement(url ? "a" : "div");
  if (url) {
    inner.href = url;
    inner.target = "_blank";
    inner.rel = "noopener";
  } else {
    item.classList.add("essays__item--soon");
  }
  inner.className = "essays__item-inner";

  const row = document.createElement("span");
  row.className = "essays__row";

  const titleEl = document.createElement("span");
  titleEl.className = "essays__title";
  titleEl.textContent = title;
  row.appendChild(titleEl);

  const dateEl = document.createElement("span");
  dateEl.className = "essays__date";
  dateEl.textContent = date;
  row.appendChild(dateEl);

  inner.appendChild(row);

  if (excerpt) {
    const excerptEl = document.createElement("span");
    excerptEl.className = "essays__excerpt";
    excerptEl.textContent = excerpt;
    inner.appendChild(excerptEl);
  }

  item.appendChild(inner);
  return item;
}

function render(essays) {
  const list = document.getElementById("essays-list");
  essays.forEach((essay) => list.appendChild(essayItem(essay)));

  // same reveal-on-scroll pattern as js/main.js, js/gallery.js, js/music.js
  if ("IntersectionObserver" in window && !reducedMotion) {
    document.documentElement.classList.add("js");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 }
    );
    list.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  }
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
