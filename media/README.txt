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
