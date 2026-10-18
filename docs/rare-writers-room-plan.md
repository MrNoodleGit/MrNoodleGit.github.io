# RARE. Writers' Room page: build plan

> **Prompt to start Claude Code (run in the repo `MrNoodleGit/MrNoodleGit.github.io`):**
> Read `docs/rare-writers-room-plan.md` and build the page it describes. Follow the repo's CLAUDE.md. Don't change any existing page, the nav or the CSP. Use the copy in the appendix exactly, and keep every `[TBD]` and `[CONFIRM]` marker. Never invent names, quotes, numbers or supporters. When the plan is silent, follow the Gap protocol.

Tags used below: `[TBD]` means a value Ra will supply. `[CONFIRM]` means a claim Ra must verify before launch. `ASSUMPTION` means a choice made without Ra's input that he should review.

---

## 1. Problem
RARE's first project, PAUSE (working title), is a play for the people building frontier AI. It needs about $5k–$8k [TBD from budget] by **Fri Nov 6, 2026** to bring writers to a writers' room in Medellín, Colombia (Dec 1–15, 2026). Ra is asking donors and writers personally, but there's nowhere to send them. ramour.org doesn't mention RARE, PAUSE or AI, and `rare-retreats.html` is a "Coming soon" placeholder left from an earlier retreat idea.

**Who it's for:**
1. Past sponsors and friends deciding whether to give.
2. Writers deciding whether to join.
3. Later, AI researchers.

## 2. Evidence
- The live page has no content, no `<h1>` and no way to give (page review, Oct 17, 2026).
- Past sponsors paid Ra by Venmo and bank transfer, plus one GoFundMe (Ra). A page gives every personal ask one link to point to.

## 3. Appetite
ASSUMPTION: one Claude Code session of a few hours. The page should be ready to share privately by **Fri Oct 23** so the link can go into donor and writer asks.

## 4. Requirements and acceptance criteria

**R1 Hidden (unlisted) until launch**
- New file: `rare-writers-room.html` (ASSUMPTION about the name), with a new stylesheet `css/rare-writers-room.css`.
- Given the site is deployed, when someone browses any existing page, then nothing links to the new page.
- `<head>` contains `<meta name="robots" content="noindex, nofollow">`.
- The page is left out of `sitemap.xml` if that file exists.
- Do not add the path to `robots.txt`, because that file is public and would advertise the path.
- `index.html`, the nav and `rare-retreats.html` are byte-for-byte unchanged.
- Note: the repo is public, so the file is visible on GitHub. Unlisted is not private. For a truly hidden build, work on an unpushed local branch and preview with `python3 -m http.server`.

**R2 Prominent donate button**
- Given a 375px-wide phone, when the page loads, then the primary Donate button is visible without scrolling.
- The same button appears again after "Where your gift goes" and again in the "Ways to give" block near the end.
- It's a plain outbound `<a>` link styled from the existing `.nav__cta` and enlarged: at least 48px tall, full width on phones.
- Its label is "Fund the room →".

**R3 Ways to give** (`id="give"`)
- A primary link "Give by card or bank →", pointing at `[TBD: DONATE_URL]`. Recommended provider: a Stripe Payment Link, used as a plain `<a>`. Don't use Stripe's Buy Button `<script>`, because the CSP blocks it. Fallback: a GoFundMe link.
- Venmo: link to `https://venmo.com/u/[TBD handle]` `[CONFIRM link format]`, plus a QR image saved locally in `media/`.
- Bank transfer: a `mailto:[TBD email]` link reading "Email for bank or Zelle details." Never publish account or routing numbers.
- Given DONATE_URL isn't set yet, when someone clicks any Fund the room button, then they jump to `#give`, which lists Venmo and the bank-transfer email.

**R4 Honesty**
- "Gifts are not tax-deductible." appears directly under every donate button and in the FAQ.
- Every `[CONFIRM]` claim carries an HTML comment `<!-- CONFIRM: ... -->` until Ra signs off.
- No invented names, quotes, credentials, logos, supporter names or amounts. Unknown values stay `[TBD]`.

**R5 Sections, in this order** (copy in the appendix)
1. Hero
2. Why this play
3. The room
4. What's next (timeline)
5. Where your gift goes (budget bars and gift amounts)
6. People
7. Supporters
8. Ways to give
9. FAQ
10. Follow along (the existing Substack embed)
11. Footer

**R6 Easy to update without a build step**
- Every value Ra will change has a comment directly above it, in the form `<!-- EDIT: what this is -->`: DONATE_URL, Venmo handle, email, amounts, raised/goal, writer names, supporter names, budget percentages.
- Given Ra searches the file for `EDIT:`, then every changeable value is found.

**R7 Matches the site**
- Fonts: Marcellus for headings and labels, EB Garamond for body text, loaded from the existing `css/fonts.css`.
- Colors from `css/style.css` `:root`: `--ink`, `--abyss`, `--teal`, `--zima`, `--text`, `--muted`.
- Layout: reuse `.section`, `.section--abyss`, `.section__label`, `.textlink`, and the `.wu-feature` card pattern for the facts box.
- One `<h1>`. Open Graph title, description and image so a privately shared link shows a preview.
- Hero image (ASSUMPTION, see open question 6): the existing painting, using the WebP `media/art-gallery-large/tower-of-babel.png.webp`, never the 3 MB PNG, darkened so text passes WCAG AA contrast.
- The page scrolls normally. Don't reuse the `.rr` / `.rr-scene` rules, which set `overflow: hidden` and `100svh`.

**R8 Technical**
- No inline `<script>` or `style=""`. No third-party scripts, fonts or iframes, except the existing Substack embed (already allowed in `frame-src`). The CSP `<meta>` stays identical to the other pages.
- Optional `js/reveal.js` fade-ins only.
- The budget bars are plain HTML and CSS, with no chart library.
- Given 375px and 1440px widths, then there's no horizontal scroll, no console errors and no CSP errors.
- Lighthouse Accessibility and Best Practices scores are each at least 90 (ASSUMPTION about the threshold).

**R9 Repo rules**
- Update `ARCHITECTURE.md` and `TODO.md` in the same commit, as CLAUDE.md requires. In TODO.md, add a "Launch checklist" listing the open questions below.
- Run CLAUDE.md's review checklist before committing.

## 5. States
| State | Behavior |
|---|---|
| DONATE_URL not set | Buttons jump to `#give` (R3). |
| No supporters yet | Show "Be the first to back the room." |
| Writers not confirmed | Show "Four writers, named here as they confirm." |
| Raised amount = $0 | Progress line commented out. Ra un-comments it once there's a first gift. |
| 100+ supporters or long names | The list wraps into columns with no overflow. Test it with 100 dummy names locally, then remove them. |
| Hero image fails to load | The `--ink` background keeps all text legible. |

## 6. Non-goals
- No payment code, checkout embed or CSP changes; donations are outbound links only.
- No edits to `index.html`, the nav, `rare-retreats.html` or the homepage "RARE." badge.
- No analytics, tracking pixels, cookies or new email capture (Substack covers updates).
- No CMS, framework or build step.
- No Spanish version for now.

## 7. Gap protocol
- **Stop and ask Ra** about anything touching money (amounts, payment links), claims about real people (names, bios, quotes), security or the CSP, or deleting or renaming files.
- **Otherwise,** make the simplest reasonable choice and log it as a bullet under "Build assumptions" at the end of this file.

## 8. Open questions for Ra (before launch, not before building)
1. **Final URL:** keep `rare-writers-room.html`, or at launch move this content into `rare-retreats.html`?
2. **Naming:** "Retreats" (page title, nav button) can read as a paid getaway. The homepage badge "RARE. — AI Strategist and Consultant" says consultancy, while this page says art studio. Reword both before launch?
3. **Payment provider:** the research recommends a Stripe Payment Link (cards and bank/ACH in one checkout), with GoFundMe as the fallback. This decides DONATE_URL.
4. **What to publish:** the Venmo handle and the contact email shown on the page.
5. **Overfunding policy:** fifth writer first, then the Denver reading? Reimburse self-funded writers?
6. **The painting:** keep the Tower of Babel hero? It can read as a warning about hubris, while the play aims to invite reflection, not lecture.
7. **Bio:** your exact wording for this audience.
8. **Claims:** are the researcher interviews and advisors under way yet? The copy says they are.

## 9. Success metrics
- **Primary:** $[TBD goal] raised by Fri Nov 6, 2026 (baseline $0).
- **Secondary:** every personal ask to donors and writers includes the link. Ask donors "Did you see the page?" to gauge its effect.

---

## Appendix: copy (use as written; adjust only for layout)

**Hero**
- Label: `RARE. · First project`
- H1: `PAUSE` with a small `working title` beneath it
- Lede: *A play for the people building artificial intelligence.*
- Line: *This December, a writers' room meets in Medellín to write it. Help bring the writers there.*
- [Fund the room →]. Below it, small: *Gifts are not tax-deductible.* Then a text link: *How the money is used ↓*

**Why this play**
A relatively small number of researchers and engineers are building the most powerful AI systems in the world. Their choices will reach everyone, and the work moves faster than anyone can comfortably think it through.

PAUSE is theater made for them. It isn't a lecture or a warning. It's a chance to stop, look at the work from the outside, and talk about it together.

We're building it from conversations with AI researchers, and researcher advisors will check that the science holds up. `[CONFIRM]`

**The room** (facts card)
- Where: Medellín, Colombia
- When: December 1–15, 2026
- Who: Ra Mour and four writers
- Goal: a complete first draft

The first week (Dec 1–8), everyone is in the room working out the story together. In the second, writers draft scenes, in Medellín or from home. Every week, actors in Denver read the new pages aloud over video. It's a working room: mornings writing together, afternoons drafting, homes chosen to keep costs down.

**What's next** (timeline)
- December 2026: writers' room, Medellín
- Early 2027: staged reading in Denver, recorded
- 2027: live performances in cities where AI is built, starting with San Francisco `[CONFIRM]`

**Where your gift goes**
Gifts pay for the writers' flights, housing and food, plus writing tools and a small reserve for surprises.

Bars (`EDIT`): Travel 34% · Housing 37% · Food & local travel 17% · Tools & workspace 1% · Reserve 11%. These are the budget's medium estimates with three funded writers (case a).

- $750 flies one writer to Medellín and back
- $1,600 brings one writer for the shared week
- $2,400 brings one writer for both weeks
- Stretch goal: $2,100 adds a fifth writer

[Fund the room →] · *Gifts are not tax-deductible.* · *Want the full budget? Email [TBD].*

If we raise more than the room needs, the rest goes to the Denver staged reading. `[CONFIRM]`

**People**
- **Ra Mour.** [CONFIRM bio] Performer, researcher and experience designer. Ra runs the room and leads the story; the writers own the craft.
- **Writers.** Four writers, named here as they confirm.

**Supporters**
With thanks to: *(list)*. Empty state: *Be the first to back the room.*

Small: *Names are listed only with permission. Prefer to stay anonymous? Just say so.*

**Ways to give** (`#give`)
- [Give by card or bank →] `[TBD DONATE_URL]`
- Venmo: @[TBD], with the QR code
- Bank transfer: *Email [TBD] for details.*
- *RARE isn't a nonprofit yet, so gifts go to Ra Mour directly and aren't tax-deductible.*

**FAQ**
- *Is my gift tax-deductible?* Not yet. RARE isn't a nonprofit, so gifts go to Ra directly. We plan to work with a fiscal sponsor for larger fundraising in 2027.
- *Is this a vacation?* No. It's a working room with daily writing hours and shared homes chosen to keep costs down. Ra will be in Medellín this winter, and lodging and food there cost less than in most US cities.
- *What if you don't reach the goal?* The room goes ahead either way; funding decides how many writers can come. `[CONFIRM]`
- *Can I give anonymously?* Yes. Just say so when you give.
- *Can I help another way?* Yes. Introductions to AI researchers who'd talk with us are just as valuable. `[CONFIRM]`

**Follow along**
*Follow the room as it happens.* Then the existing Substack embed (`https://ramour.substack.com/embed`).

**Footer**
`← Ra Mour` · © 2026 Ra Mour

---

## Build assumptions
*(The builder appends entries here.)*
