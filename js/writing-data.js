/* Ra Mour — essays: fetch + parse writing.md (template inside), and
   build one list item per essay.
   Shared by the homepage Mind teaser (js/writing-home.js) and the
   writing.html archive (js/writing-archive.js). */

// Blocks separated by "---" lines; "title:", "date:", and "url:" lines
// can appear in any order, "url:" is optional; any other line is the
// excerpt. Comments and "#" headings are ignored. See writing.md.
function parseEssays(md) {
  const blocks = md.replace(/<!--[\s\S]*?-->/g, "").split(/\n\s*---+\s*\n/);
  const essays = [];
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    if (!lines.length) continue;

    const essay = { title: "", date: "", url: "", excerpt: [] };
    for (const line of lines) {
      const match = line.match(/^(title|date|url):\s*(.+)$/i);
      if (match) essay[match[1].toLowerCase()] = match[2].trim();
      else essay.excerpt.push(line);
    }
    essay.excerpt = essay.excerpt.join(" ");
    if (essay.title) essays.push(essay);
  }
  return essays;
}

async function listEssays() {
  try {
    const res = await fetch("writing.md", { cache: "no-store" });
    if (!res.ok) return [];
    return parseEssays(await res.text());
  } catch {
    return [];
  }
}

// one <li> for the essay lists; links out when the essay has a url,
// otherwise shows as "coming soon"
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
