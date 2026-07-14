/* Ra Mour — essays: fetch + parse writing.md (template inside).
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
