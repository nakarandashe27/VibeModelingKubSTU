// A fingertip applies pressure to a patch of the surface. Neighbouring
// patches share the displacement; damping lets the wake settle after release.
function createWaterSurface() {
  const cell = 25;
  const cols = 65, rows = 37;
  const height = new Float32Array(cols * rows);
  const velocity = new Float32Array(height.length);
  const step = 1 / 120;
  const spread = (215 / cell) ** 2;
  const radius = 245;
  let active = false, remainder = 0, pressure = 0, timeLeft = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0;

  function touch(px, py) {
    if (!active || (timeLeft <= 0 && pressure < .015)) {
      x = px;
      y = py;
    }
    active = true;
    targetX = px;
    targetY = py;
    timeLeft = .28;
  }

  function release() {
    // Keep very short taps perceptible even between two paint frames.
    timeLeft = Math.min(timeLeft, .075);
  }

  function advance(dt) {
    if (!active) return;
    remainder += dt;
    while (remainder >= step) {
      remainder -= step;
      const follow = 1 - Math.exp(-step / .085);
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      const touching = timeLeft > 0;
      timeLeft -= step;
      pressure += ((touching ? 1 : 0) - pressure) *
        (1 - Math.exp(-step / (touching ? .12 : .32)));

      for (let j = 0; j < rows; j++) {
        const dy = (j * cell - y) / radius;
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const h = height[k];
          const curvature = (i ? height[k - 1] - h : 0)
            + (i + 1 < cols ? height[k + 1] - h : 0)
            + (j ? height[k - cols] - h : 0)
            + (j + 1 < rows ? height[k + cols] - h : 0);
          const dx = (i * cell - x) / radius;
          const weight = Math.max(0, 1 - dx * dx - dy * dy);
          const force = 700 * pressure * weight * weight;
          velocity[k] += step * (spread * curvature - 7 * h - 3.7 * velocity[k] + force);
        }
      }
      for (let k = 0; k < height.length; k++) height[k] += velocity[k] * step;
      if (timeLeft < -6) { reset(); break; }
    }
  }

  function heightAt(px, py) {
    if (!active) return 0;
    const gx = Math.max(0, Math.min(cols - 1, px / cell));
    const gy = Math.max(0, Math.min(rows - 1, py / cell));
    const i = Math.min(cols - 2, Math.floor(gx)), j = Math.min(rows - 2, Math.floor(gy));
    const k = j * cols + i;
    const u = gx - i, v = gy - j;
    // A shallow contact depression follows the fingertip while the grid
    // carries the slower wake. Both use the same eased pressure and position.
    const contact = Math.max(0, 1 - ((px - x) ** 2 + (py - y) ** 2) / radius ** 2);
    return 16 * pressure * contact * contact
      + (height[k] * (1 - u) + height[k + 1] * u) * (1 - v)
      + (height[k + cols] * (1 - u) + height[k + cols + 1] * u) * v;
  }

  function reset() {
    active = false;
    pressure = timeLeft = remainder = 0;
    height.fill(0);
    velocity.fill(0);
  }

  return { touch, release, advance, heightAt, reset };
}

// Wave geometry uses a fixed 1600 × 900 drawing space so the gesture feels
// the same on the projector and on a touch screen.
function createWave(canvas) {
  let slide = canvas.closest('.slide');
  const continuous = canvas.hasAttribute('data-continuous');
  const pointerArea = continuous ? slide.parentElement : slide;
  // Vertical centre, ribbon scale and rise at the right edge in drawing units.
  const layouts = {
    a: [215, 1, 0],
    speaker: [834, .22, 0],
    question: [840, .52, 480],
    questions: [635, .72, 255],
    task: [815, .37, 65],
    route: [829, .29, 0],
    site: [862, .19, 0],
    model: [852, .22, 0],
    plan: [866, .20, 0],
    case: [850, .24, 0],
    manege: [852, .22, 0],
    finish: [840, .28, 0]
  };
  let target = layouts.a;
  const layout = [...target];
  let started = false;
  const tide = canvas.dataset.wave === 'tide';
  const cobalt = canvas.dataset.wave === 'cobalt';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d');
  const water = createWaterSurface();
  let glyphAtlas;
  let bounds;
  let frame;
  let lastPaint = 0;
  let time = 0;




  // Rasterize the glyphs once. A frame then only positions small sprites.
  const glyphs = ['.', ':', '~', '-', '=', '+', '/', '|', '*', '#'];
  const tones = tide
    ? ['#559aca', '#237eb4', '#1168a1', '#0d588f', '#12497d', '#083663', '#092c50', '#083159']
    : cobalt ? ['#274dcc', '#4177dc', '#5693ed', '#72acff', '#8bbcff', '#add9ff', '#cdf1ff', '#e0f8ff']
    : ['#10436e', '#155d93', '#1d79b4', '#309bd2', '#56b9e8', '#85d8ee', '#b8ebff', '#f0ffff'];

  function buildAtlas() {
    glyphAtlas = document.createElement('canvas');
    glyphAtlas.width = glyphs.length * 48;
    glyphAtlas.height = tones.length * 48;
    const brush = glyphAtlas.getContext('2d');
    brush.font = 'bold 37px Consolas, monospace';
    brush.textAlign = 'center';
    brush.textBaseline = 'middle';
    tones.forEach((color, row) => {
      brush.fillStyle = color;
      glyphs.forEach((glyph, col) => brush.fillText(glyph, col * 48 + 24, row * 48 + 24));
    });
  }

  function resize() {
    if (slide.hidden) return;
    bounds = canvas.getBoundingClientRect();
    if (!bounds.width) return;
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(bounds.width * scale);
    canvas.height = Math.round(bounds.height * scale);
    ctx.setTransform(canvas.width / 1600, 0, 0, canvas.height / 900, 0, 0);
    paint();
  }

  function mark(x, y, size, angle, glyph, tone) {
    if (x < -25 || x > 1625 || y < -25 || y > 925) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(glyphAtlas, glyph * 48, tone * 48, 48, 48, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function ribbon(back) {
    const steps = back ? 109 : 148;
    const strands = back ? 8 : 20;
    for (let column = 0; column < steps; column++) {
      const u = column / (steps - 1);
      const phase = u * 7.25 + time * .24 + (back ? 1.45 : 0);
      const twist = u * 9.4 - .65 + time * .20;
      const centerX = u * 1910 - 155 + 70 * Math.sin(phase * 1.5);
      const centerY = (cobalt ? 390 : 215) + (back ? 85 : 0) + (cobalt ? 118 : 175) * Math.sin(phase + .20)
        + 86 * Math.sin(phase * 1.75 - .4);
      const lift = layout[2] * Math.max(0, Math.min(1, centerX / 1600)) ** 4;
      for (let line = 0; line < strands; line++) {
        const v = line / (strands - 1) * 2 - 1;
        const strandX = centerX + 75 * v * Math.sin(twist);
        const spreadY = v * (36 + 102 * Math.cos(twist)) + v * v * 37 * Math.sin(phase);
        const strandY = layout[0] + (centerY - 215 + spreadY) * layout[1] - lift;
        const bend = water.heightAt(strandX, strandY);
        const x = strandX - bend * .34;
        const y = strandY + bend;
        const light = .5 + .5 * Math.sin(twist + v * 2.3);
        const tone = back ? Math.round(light * 2) : Math.round(1 + light * 6);
        const glyph = (Math.floor(5 + 3.4 * Math.sin(twist + v * 2 + u * 9)) + (line % 3)) % 10;
        const size = (back ? 13 : 14 + 8 * light) * (.62 + .38 * layout[1]);
        mark(x, y, size, .56 * Math.cos(phase) + v * .13 + bend * .003, glyph, tone);
      }
    }
  }

  function surface() {
    // A perspective field of strings. The horizon folds before the foreground,
    // giving successive crests different depths, densities and type sizes.
    for (let row = 0; row < 31; row++) {
      const depth = row / 30;
      const segments = Math.round(124 - depth * 46);
      for (let column = 0; column < segments; column++) {
        const u = column / (segments - 1);
        const phase = 9.1 * u - depth * 4.8 + time * .54;
        const x = -75 + u * 1750 + 26 * Math.sin(phase + depth);
        const y = 521 + depth * depth * 440 + (54 + 47 * depth) * Math.sin(phase)
          + 30 * Math.cos(u * 16 + depth * 3 + time * .25);
        const bend = water.heightAt(x, y);
        const tone = Math.round((.40 + depth * .60) * (4.9 + 2.1 * Math.sin(phase)));
        const glyph = Math.floor((row + Math.floor(4 + 3 * Math.cos(phase))) % 10);
        mark(x - bend * .28, y + bend, 12 + depth * 17,
          .46 * Math.cos(phase) + bend * .003, glyph, tone);
      }
    }
  }

  function paint() {
    if (!bounds?.width) return;
    ctx.clearRect(0, 0, 1600, 900);
    if (tide) surface();
    else { ribbon(true); ribbon(false); }
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);

    const dt = Math.max(0, Math.min(.05, (now - lastPaint) / 1000));
    lastPaint = now;
    time += dt;
    const follow = 1 - Math.exp(-dt / .24);
    for (let i = 0; i < layout.length; i++) layout[i] += (target[i] - layout[i]) * follow;
    water.advance(dt);
    paint();
  }

  function sync(nextSlide) {
    if (continuous && nextSlide instanceof HTMLElement) {
      slide = nextSlide;
      if (canvas.parentElement !== slide) slide.prepend(canvas);
      target = layouts[slide.id] || layouts.route;
      if (!started || reduced.matches) Object.assign(layout, target);
      started = true;
    }
    cancelAnimationFrame(frame);
    if (!continuous) water.reset();
    if (reduced.matches) Object.assign(layout, target);
    if (slide.hidden || document.hidden) return;
    resize();
    lastPaint = performance.now();
    if (!reduced.matches) frame = requestAnimationFrame(loop);
  }

  function disturb(event) {
    if (reduced.matches || !bounds?.width) return;
    const x = (event.clientX - bounds.x) * 1600 / bounds.width;
    const y = (event.clientY - bounds.y) * 900 / bounds.height;
    const baseline = layout[0] - layout[2] * Math.max(0, Math.min(1, x / 1600)) ** 4;
    water.touch(x, continuous && slide.id !== 'a' ? Math.max(baseline - 90, Math.min(baseline + 90, y)) : y);
  }

  buildAtlas();
  pointerArea.addEventListener('pointermove', disturb);
  pointerArea.addEventListener('pointerdown', disturb);
  pointerArea.addEventListener('pointerleave', water.release);
  pointerArea.addEventListener('pointercancel', water.release);
  pointerArea.addEventListener('pointerup', water.release);
  new ResizeObserver(resize).observe(canvas);
  document.fonts.ready.then(resize);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  return { sync };
}

