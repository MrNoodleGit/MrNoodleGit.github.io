/* Ra Mour — music page: renders curated Spotify recommendations
   from music.md (template inside) as embedded players. */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- music.md ---------- */

// Blocks separated by "---" lines; the first line is "track:", "playlist:",
// or "album:" followed by a bare Spotify ID or a full share link; every
// line after that is the note. Comments and "#" headings are ignored.
// See the template inside music.md.
function extractSpotifyId(value) {
  const urlMatch = value.match(
    /open\.spotify\.com\/(?:intl-\w+\/)?(?:track|playlist|album)\/([A-Za-z0-9]+)/
  );
  if (urlMatch) return urlMatch[1];
  const bare = value.split(/[?\s]/)[0].trim();
  return /^[A-Za-z0-9]+$/.test(bare) ? bare : null;
}

function parseMusic(md) {
  const blocks = md.replace(/<!--[\s\S]*?-->/g, "").split(/\n\s*---+\s*\n/);
  const entries = [];
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    if (!lines.length) continue;

    const head = lines[0].match(/^(track|playlist|album):\s*(.+)$/i);
    if (!head) continue;

    const id = extractSpotifyId(head[2]);
    if (!id) continue;

    entries.push({
      type: head[1].toLowerCase(),
      id,
      note: lines.slice(1).join(" "),
    });
  }
  return entries;
}

async function listMusic() {
  try {
    const res = await fetch("music.md");
    if (!res.ok) return [];
    return parseMusic(await res.text());
  } catch {
    return [];
  }
}

/* ---------- render ---------- */

function embedHeight(type) {
  return type === "track" ? 152 : 352;
}

function musicCard(entry) {
  const card = document.createElement("article");
  card.className = "music-card reveal";

  if (entry.note) {
    const note = document.createElement("p");
    note.className = "music-card__note";
    note.textContent = entry.note;
    card.appendChild(note);
  }

  const embed = document.createElement("div");
  embed.className = "music-card__embed";

  const iframe = document.createElement("iframe");
  iframe.src = `https://open.spotify.com/embed/${entry.type}/${entry.id}?utm_source=generator&theme=0`;
  iframe.width = "100%";
  iframe.height = String(embedHeight(entry.type));
  iframe.frameBorder = "0";
  iframe.loading = "lazy";
  iframe.allow =
    "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  iframe.title = entry.note || `Spotify ${entry.type} embed`;

  embed.appendChild(iframe);
  card.appendChild(embed);
  return card;
}

function render(entries) {
  const grid = document.getElementById("music-grid");
  entries.forEach((entry) => grid.appendChild(musicCard(entry)));

  // same reveal-on-scroll pattern as js/main.js and js/gallery.js
  if ("IntersectionObserver" in window && !reducedMotion) {
    document.documentElement.classList.add("js");
    const revealObserver = new IntersectionObserver(
      (revealEntries) => {
        for (const revealEntry of revealEntries) {
          if (revealEntry.isIntersecting) {
            revealEntry.target.classList.add("is-visible");
            revealObserver.unobserve(revealEntry.target);
          }
        }
      },
      { threshold: 0.1 }
    );
    grid.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  }
}

listMusic()
  .then((entries) => {
    const grid = document.getElementById("music-grid");
    if (!entries.length) {
      grid.innerHTML =
        '<p class="music-note">No recommendations yet — add one to music.md.</p>';
      return;
    }
    render(entries);
  })
  .catch(() => {
    document.getElementById("music-grid").innerHTML =
      '<p class="music-note">The list couldn’t be loaded right now. <a href="index.html">Back home</a>.</p>';
  });
