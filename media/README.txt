Media files for the "What I love" scenes
=========================================

Drop your video files (and optional poster images) into this folder
with these exact names:

  dancing.mp4        — e.g. dancing_salsa_in_colombia.mp4 or red_twist_short.mp4
  dancing.jpg        — optional poster frame shown while the video loads

  martial-arts.mp4   — e.g. bjj_rolling.mp4 or ra_mour_and_jr_battle_oct2024.mp4
  martial-arts.jpg   — optional poster frame

  meditation.mp4     — e.g. red_meditation_short_no_audio.mp4
  meditation.jpg     — optional poster frame

Notes
-----
- Until a video exists, its scene shows a dark teal backdrop that matches
  the site — nothing breaks.
- Videos autoplay muted and loop, so audio tracks are unnecessary;
  stripping them shrinks the files.
- GitHub rejects files over 100 MB. Aim well under that. A good
  compression command (10–20 MB for a ~30s 1080p clip):

    ffmpeg -i input.mp4 -an -vf "scale=-2:1080" -c:v libx264 -crf 27 -preset slow -movflags +faststart dancing.mp4

  Ask Claude to run this for you once the originals are in the folder.

- Phones load a smaller 720p copy of each video (e.g. dancing-720.mp4).
  After replacing a video, remake its copy too:

    ffmpeg -i dancing.mp4 -an -vf "scale=-2:720" -c:v libx264 -crf 28 -preset slow -movflags +faststart dancing-720.mp4


Altar images (media/art-gallery/)
=================================

Drop images into media/art-gallery/ and push. The "Build altar gallery"
GitHub Action (scripts/build-gallery.mjs) then makes resized WebP copies in
media/art-gallery-thumbs/ and media/art-gallery-large/ and updates the list
in media/art-gallery.json — the site reads only that list, so a new image
appears about a minute after the push. Don't edit those generated files by
hand. To see a new image locally before pushing, run:

    npm ci --prefix scripts --omit=dev
    node scripts/build-gallery.mjs
