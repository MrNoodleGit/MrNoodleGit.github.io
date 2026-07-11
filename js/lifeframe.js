/* Ra Mour — Life: single frame, horizontal toggle between scenes */

(() => {
  const frame = document.getElementById("lifeframe");
  if (!frame) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides = [...frame.querySelectorAll(".lifeframe__slide")];
  const dots = [...frame.querySelectorAll(".lifeframe__dot")];
  const arrows = [...frame.querySelectorAll(".lifeframe__arrow")];

  let current = Math.max(0, slides.findIndex((s) => s.classList.contains("is-active")));

  function activeVideo() {
    return slides[current].querySelector(".lifeframe__video");
  }

  function goTo(index) {
    if (index === current) return;
    const prevVideo = activeVideo();
    prevVideo.pause();

    slides[current].classList.remove("is-active");
    slides[current].setAttribute("aria-hidden", "true");
    dots[current].classList.remove("is-active");
    dots[current].removeAttribute("aria-current");

    current = (index + slides.length) % slides.length;

    slides[current].classList.add("is-active");
    slides[current].removeAttribute("aria-hidden");
    dots[current].classList.add("is-active");
    dots[current].setAttribute("aria-current", "true");

    const video = activeVideo();
    frame.classList.add("is-paused");
    video.play().catch(() => {});
  }

  arrows.forEach((arrow) => {
    arrow.addEventListener("click", () => goTo(current + Number(arrow.dataset.dir)));
  });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => goTo(i));
  });

  // tap the frame (not the nav) to play/pause — fallback when autoplay is blocked
  frame.addEventListener("click", (e) => {
    if (e.target.closest(".lifeframe__nav")) return;
    const video = activeVideo();
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });

  slides.forEach((slide) => {
    const video = slide.querySelector(".lifeframe__video");
    video.addEventListener("play", () => {
      if (slide.classList.contains("is-active")) frame.classList.remove("is-paused");
    });
    video.addEventListener("pause", () => {
      if (slide.classList.contains("is-active")) frame.classList.add("is-paused");
    });
    video.muted = true;
    video.playsInline = true;
  });

  frame.classList.add("is-paused");

  if (reducedMotion) return;

  if ("IntersectionObserver" in window) {
    const frameObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) activeVideo().play().catch(() => {});
          else activeVideo().pause();
        }
      },
      { threshold: 0.35 }
    );
    frameObserver.observe(frame);
  } else {
    activeVideo().autoplay = true;
  }
})();
