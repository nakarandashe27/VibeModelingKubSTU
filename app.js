const stage = document.querySelector('.stage');
const slides = [...stage.querySelectorAll('.slide')];
const links = [...document.querySelectorAll('.controls a')];
const jump = document.querySelector('#jump');
const prev = document.querySelector('#prev');
const next = document.querySelector('#next');
let current = 0;
let selectedCover = 0;

function connectTitle(word) {
  const letters = word.textContent.toUpperCase();
  const slide = word.closest('.slide');
  const alphabet = slide.id === 'c' ? '#@=+|#' : slide.id === 'b' ? '##=%*+' : '#@%+=*';
  const canvas = document.createElement('canvas');
  const stencil = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  word.append(canvas);
  const mask = stencil.getContext('2d', { willReadFrequently: true });
  const ink = canvas.getContext('2d');

  function draw() {
    const box = word.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const scale = 1600 / slide.getBoundingClientRect().width;
    const style = getComputedStyle(word);
    const width = canvas.width = stencil.width = Math.ceil(parseFloat(style.width) * scale);
    const height = canvas.height = stencil.height = Math.ceil(parseFloat(style.height) * scale);
    const size = parseFloat(style.fontSize) * scale;
    mask.font = style.fontWeight + ' ' + size + 'px ' + style.fontFamily;
    mask.letterSpacing = parseFloat(style.letterSpacing) * scale + 'px';
    const metrics = mask.measureText(letters);
    mask.fillStyle = style.getPropertyValue('--ink').trim();
    const baseline = (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    if (word.hasAttribute('data-arc')) {
      const radius = width * .396;
      const advances = Array.from(letters, char => mask.measureText(char).width + size * .04);
      let angle = -advances.reduce((sum, advance) => sum + advance, 0) / (2 * radius);
      mask.textAlign = 'center';
      [...letters].forEach((char, index) => {
        const half = advances[index] / (2 * radius);
        mask.save();
        mask.translate(width / 2, height / 2);
        mask.rotate(angle + half);
        mask.fillText(char, 0, -radius);
        mask.restore();
        angle += 2 * half;
      });
    } else {
      mask.fillText(letters, 0, baseline, width);
    }
    const pixels = mask.getImageData(0, 0, width, height).data;
    ink.globalAlpha = .18;
    ink.drawImage(stencil, 0, 0);
    ink.globalAlpha = 1;
    ink.fillStyle = mask.fillStyle;
    const pitch = Math.max(3, size / 24);
    const row = pitch * 1.18;
    ink.font = 'bold ' + row * 1.23 + 'px Consolas, monospace';
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    for (let y = row / 2; y < height; y += row) {
      for (let x = pitch / 2; x < width; x += pitch) {
        if (pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] < 110) continue;
        const band = Math.floor(x / (pitch * 4) + y / (row * 2) + 3 * Math.sin(x / 75));
        ink.fillText(alphabet[((band % alphabet.length) + alphabet.length) % alphabet.length], x, y);
      }
    }
    word.classList.add('has-ascii');
  }
  new ResizeObserver(draw).observe(word);
  document.fonts.ready.then(draw);
}

function showSlide(index) {
  if (index !== current) slides[current].querySelectorAll('video').forEach(video => video.pause());
  current = index;
  if (slides[index].classList.contains('wave-slide')) selectedCover = index;
  slides.forEach((slide, position) => {
    slide.hidden = position !== index;
    if (position === index) links[position]?.setAttribute('aria-current', 'page');
    else links[position]?.removeAttribute('aria-current');
  });
  if (jump) {
    jump.selectedIndex = index;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
  }
  waves.forEach(wave => wave.sync(slides[index]));
}

function readHash() {
  const index = slides.findIndex(slide => '#' + slide.id === location.hash);
  showSlide(Math.max(0, index));
}

function selectSlide(index) {
  const next = Math.max(0, Math.min(slides.length - 1, index));
  location.hash = slides[next].id;
}

async function fullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await stage.requestFullscreen();
}

const waves = [...document.querySelectorAll('[data-wave]')].map(createWave);
document.fonts.ready.then(() => document.querySelectorAll('[data-ascii]').forEach(connectTitle));
window.addEventListener('hashchange', readHash);
document.querySelector('#fullscreen').addEventListener('click', fullscreen);
if (jump) {
  slides.forEach((slide, i) => {
    const title = slide.querySelector('h1,h2');
    const label = title.getAttribute('aria-label') || title.innerText.replace(/\s+/g, ' ').trim();
    jump.add(new Option((i + 1) + ' / ' + slides.length + '  ·  ' + label, slide.id));
  });
  jump.addEventListener('change', () => selectSlide(jump.selectedIndex));
  prev.addEventListener('click', () => selectSlide(current - 1));
  next.addEventListener('click', () => selectSlide(current + 1));
}
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('video, select')) return;
  if (event.key.toLowerCase() === 'f') fullscreen();
  if (jump) {
    if (event.key === 'ArrowRight') selectSlide(current + 1);
    if (event.key === 'ArrowLeft') selectSlide(current - 1);
    return;
  }
  if (event.key === 'ArrowRight') selectSlide(slides[current].classList.contains('wave-slide') ? slides.findIndex(slide => slide.id === 'speaker') : current + 1);
  if (event.key === 'ArrowLeft') selectSlide(slides[current].id === 'speaker' ? selectedCover : slides[current].classList.contains('wave-slide') ? current : current - 1);
});

document.querySelectorAll('.movie').forEach(movie => {
  const video = movie.querySelector('video');
  const play = movie.querySelector('.play');
  const strip = movie.closest('.reel-strip');
  if (strip) video.addEventListener('play', () => {
    strip.querySelectorAll('video').forEach(other => {
      if (other !== video && !other.paused) other.pause();
    });
  });
  play.addEventListener('click', async () => {
    video.controls = true;
    play.hidden = true;
    try {
      await video.play();
      video.focus();
    } catch {
      play.hidden = false;
    }
  });
});

readHash();

