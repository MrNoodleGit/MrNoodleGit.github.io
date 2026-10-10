/* Ra Mour — homepage Mind section: teases the most recent essays from
   writing.md (js/writing-data.js). Full list lives on writing.html. */

const WRITING_HOME_LIMIT = 3;

listEssays().then((essays) => {
  const list = document.getElementById("essays-teaser");
  if (!list) return;

  if (!essays.length) {
    list.hidden = true;
    return;
  }

  essays.slice(0, WRITING_HOME_LIMIT).forEach((essay) => list.appendChild(essayItem(essay)));
  observeReveals(list);
});
