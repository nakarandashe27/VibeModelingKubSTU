const answerList = document.querySelector('.answer-list');
const replies = [
  'Начнём с небольшой задачи и понятного результата.',
  'Посмотрим, чем можно управлять и что выбирать самому.',
  'Сравним оба способа на реальном проекте.',
  'Разберём варианты работы в привычном софте.',
  'Какую следующую задачу вы хотели бы передать ИИ?'
];
answerList.addEventListener('click', event => {
  const choice = event.target.closest('button');
  if (!choice) return;
  const choices = [...answerList.children];
  choices.forEach(button => button.setAttribute('aria-pressed', String(button === choice)));
  document.querySelector('.question-prompt').textContent = replies[choices.indexOf(choice)];
});

const demo = document.querySelector('#demo-view');
document.querySelectorAll('.view-choices').forEach(group => {
  group.addEventListener('click', event => {
    const choice = event.target.closest('[data-panel]');
    if (!choice) return;
    group.querySelectorAll('[data-panel]').forEach(button => {
      const selected = button === choice;
      button.setAttribute('aria-pressed', String(selected));
      document.getElementById(button.dataset.panel).hidden = !selected;
    });
  });
});
document.querySelectorAll('.inline-demo').forEach(button => {
  button.addEventListener('click', () => {
    const section = button.closest('.slide');
    const url = section.querySelector('.text-link').href;
    const title = section.querySelector('h2').textContent;
    const frame = document.createElement('iframe');
    frame.title = title;
    frame.src = url;
    frame.allowFullscreen = true;
    demo.querySelector('strong').textContent = title;
    demo.querySelector('a').href = url;
    // The dialog must be inside the fullscreen element to remain visible during a talk.
    document.querySelector('.stage').append(demo);
    demo.append(frame);
    demo.showModal();
  });
});
demo.addEventListener('close', () => demo.querySelector('iframe')?.remove());
demo.addEventListener('keydown', event => event.stopPropagation());

if (matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) {
  const surfaces = document.querySelectorAll('.answer-list button,.route-list a,.resource-cards a,.recording');
  surfaces.forEach(surface => {
    surface.addEventListener('pointermove', event => {
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--spot', (event.clientX - bounds.left) * 100 / bounds.width + '%');
    });
    surface.addEventListener('pointerleave', () => surface.style.removeProperty('--spot'));
  });
}
