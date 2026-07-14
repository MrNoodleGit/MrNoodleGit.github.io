/* Ra Mour — homepage Mind section: teases the most recent essays from
   writing.md (js/writing-data.js). Full list lives on writing.html. */

const WRITING_HOME_LIMIT = 3;

function essayRow({ title, date, url, excerpt }) {
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

listEssays().then((essays) => {
  const list = document.getElementById("essays-teaser");
  if (!list) return;

  if (!essays.length) {
    list.hidden = true;
    return;
  }

  essays.slice(0, WRITING_HOME_LIMIT).forEach((essay) => list.appendChild(essayRow(essay)));

  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
});
