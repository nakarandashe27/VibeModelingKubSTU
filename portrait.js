// Right half of the displayed portrait sampled into 8 × 10 px cells at 1600 × 900.
// Cached luminance keeps the portrait readable directly from a local file.
(() => {
  const canvas = document.querySelector('.portrait-grain');
  if (!canvas) return;
  const slide = canvas.closest('.slide');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sample = `88315898aa984511111111111113333222333333
8898996776311111135781111113332222333333
88599832111112579aaa91111113332222333333
8842111112469aaaaaaa92111113332222333333
983112469aaaaaaaaaaa92111113332222333333
89568aaaaaaaaaaaaaaa92111113332222333333
98aaaaaaaaaaaaaaaaaa92111113333222333333
989aaaaaaaaaaaaaaaaa93111113333222333333
889aaaaaaaaaaaaaaaaa93111113333222333333
989aaaaaaaaaaaaaaaaa93111112333322333333
889aaaaaaaaaaaaaaaaa93111112333322333333
889aaaaaaaaaaaaaaaaa94111112333322333333
889aaaaaaaaaa88aaaaa94111112333322333333
889aaaaaaaaa9548aaaa94111112333322333333
889aaaaaaaaa7437aaaa94111112333322333333
889aaaaaaaaa7338aaaa95111112333322333333
889aaaaaaaaa967aaaaa95111112333322333333
989aaaaaaaaaaaaaaaaa95111112333322333333
889aaaaaaaaaaaaaaaaa95111112333322333333
889aaaaaaaaaaaaaaaaa95111114333322333333
889aaaaaaaaaaaaaaaaa95111114333322333333
989baaaaaaaaaaaaaaaa95111212333322333333
989baaaaaaaaaaaaaaaa96111211333322333333
989bbaaaaaaaaaaaaaaa96111211333322233333
989baaaaaaaaaaaaaaaa96111211333332233333
989aaaaaaaaaaaaaaaaa97111111333322233333
799aaaaaaaaaaaaaaaaa97111111333332233333
458aaaaaaaaaaaaaaaaa97111111333332233333
476aaaaaaaaaaaaaaaaa97111111333332233333
587aaaaaaaaaaaaaaaaa98111111333332233333
8979aaaaaaaaaaaaaaaa98111111333332233333
8988aaaaaaaaaaaaaaaa98111111333322233333
8997aaaaaaaaaaaaaaaa98111111333322233333
7887aaaaaaaaaaaaaaaa98111111333332233333
898aaaaaaaaaaaaaaaaa98111111233332233333
998aaaaaaaaaaaaaaaaaa9111111233332233333
998aaaaaaaaaaaaaaaaa98111111233332233333
998aaaaaaaaaaaaaaaa997111111233332233333
998aaaaaaaaaaaaaa99887111111233332233333
2469aaaaaaaaaaaa998886111111233332233333
111148aaaaaaaaa9988886211111233322233333
1111115aaaaaa999988886211111233332233333
11111115aaaa9999888886211111233332233333
111111119aaa9999888876211111233332233333
111111116aa99998888876211111233332233333
111111112a998988888776211111233332233333
1111111115988888888775311111233332233333
1111111111888888887775311111133332233333
1111111111288888877765311111133332223333
1111111111158888777765311111133322223333
1111111111117888777665311111133333223333
1111111111113877777665311111133332223333
1111111111111577777665311111133333223333
1111111111111177776665311111133333223333
1111111111111677766665311111133333223333
1111111111117777666665411111133333223333
1111111111115776666665411111133333223333
1111371111111576666665411111133333223333
11112a5111111366666655411111123333223333
1111183111111266666655411111123333223333
1111162111111266666655411111123333223333
1111133111111266655555411111123333223333
1111117111111266655555411111123333223333
1111117211111255555544321111123333213333
1111115411111355444443321111123333213333
1111113511111344443333321111123333212333
1111112311111233333333221211123333212333
1111112211111233358766621121113333212333
1111114311111444556665555544433332212333
1111124561112888888888888766543332212333
1111243674117888888888888776543332212333
1111225675178888888888887766543332212233
1111155564587877777777766554332221212222
1111457667888888999877665544332222111222
1112467777777777766644445556777778888999
1233335899999999999999999999999999999999
2223344699999999999998888777666655554444
2222235565555444443333333334444444444444
1111112454444444444444444444444444444444
1112233344444444444444444444444444444444
1112233345444444444444444444444444444444
1111233345444444444444444444444444444444
1111233334444444444444444444444444444444
1111223344544444444444444555556666667777
1111123344566677778888888888888888888888
1111122223588888888888888877766655544444
1111112343465555554337545555667778888888
1111111124378888899838877666555555555555
1111122214454555555318777788999999998887
1111112322479999988738766555555555555566`.split('\n');
  const ink = document.createElement('canvas');
  ink.width = 16 * 24;
  ink.height = 24;
  const brush = ink.getContext('2d');
  brush.font = 'bold 19px Consolas, monospace';
  brush.textAlign = 'center';
  brush.textBaseline = 'middle';
  const glyphs = '@@##%&*+=~:;-...';
  for (let tone = 0; tone < 16; tone++) {
    brush.fillStyle = 'rgb(' + (9 + tone * 5) + ',' + (41 + tone * 7) + ',' + (73 + tone * 8) + ')';
    brush.fillText(glyphs[tone], tone * 24 + 12, 12);
  }

  const cells = [];
  let seed = 27;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  sample.forEach((row, j) => {
    [...row].forEach((value, i) => {
      const u = (i + .5) / row.length;
      const y = j * 10 + 5;
      const drift = u ** 3;
      const openSpace = Math.max(0, 1 - y / 150, (y - 755) / 145);
      const trail = random();
      const x = 324 + i * 8 + drift * (20 + 46 * trail + 185 * openSpace * trail);
      const phase = random() * Math.PI * 2;
      cells.push({ x, y, drift, phase, tone: parseInt(value, 16),
        size: 11.5 - 2 * drift + 1.8 * random(),
        alpha: Math.min(1, u * 5) * (.9 - .64 * drift) });
    });
  });

  let time = 0, frame = 0, last = 0;
  let pointerX = -800, pointerY = -800, influence = 0, contact = 0;
  function draw() {
    ctx.clearRect(0, 0, 1600, 900);
    for (const cell of cells) {
      const { x, y, drift, phase, tone, size } = cell;
      const sway = time * .72 + y * .013;
      const distance = ((x - pointerX) / 130) ** 2 + ((y - pointerY) / 115) ** 2;
      const wake = Math.max(0, 1 - distance) ** 2 * influence;
      const dx = drift * (8 * Math.sin(sway) + 13 * Math.sin(time * .55 + phase)) + 18 * wake;
      const dy = drift * (9 * Math.cos(sway) + 7 * Math.sin(time * .8 + phase)) + wake * 9;
      ctx.globalAlpha = cell.alpha * (1 - drift * .25 * (1 + Math.sin(time + phase)));
      ctx.drawImage(ink, tone * 24, 0, 24, 24, x + dx - size / 2, y + dy - size / 2, size, size);
    }
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = (now - last) / 1000;
    if (dt < 1 / 30) return;
    last = now;
    time += Math.min(dt, .1);
    influence += (contact - influence) * (1 - Math.exp(-dt * 5));
    draw();
  }
  function sync() {
    cancelAnimationFrame(frame);
    if (slide.hidden || document.hidden) return;
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(1.5, devicePixelRatio);
    canvas.width = Math.max(1, Math.round(box.width * dpr));
    canvas.height = Math.max(1, Math.round(box.height * dpr));
    ctx.setTransform(canvas.width / 1600, 0, 0, canvas.height / 900, 0, 0);
    contact = influence = 0;
    draw();
    last = performance.now();
    if (!reduced.matches) frame = requestAnimationFrame(tick);
  }
  slide.addEventListener('pointermove', event => {
    const box = slide.getBoundingClientRect();
    pointerX = (event.clientX - box.left) * 1600 / box.width;
    pointerY = (event.clientY - box.top) * 900 / box.height;
    contact = 1;
  });
  slide.addEventListener('pointerleave', () => { contact = 0; });
  new ResizeObserver(sync).observe(canvas);
  new MutationObserver(sync).observe(slide, { attributes: true, attributeFilter: ['hidden'] });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
