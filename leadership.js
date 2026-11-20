const leadership = ZIOK_CONTENT?.leadership ?? ZIOK_COMMUNITY_DEFAULTS.leadership;
const terms = ZIOK_CONTENT?.terms ?? ZIOK_COMMUNITY_DEFAULTS.terms;
const tablist = document.querySelector('[role="tablist"]');
const main = document.getElementById('main-content');
tablist.replaceChildren();
main.querySelectorAll('[role="tabpanel"]').forEach(panel => panel.remove());

function translatedText(element, english, zomi) {
  element.textContent = english;
  element.dataset.contentEn = english;
  element.dataset.contentZo = zomi;
}
function memberCard(member) {
  const card = document.createElement('article'); card.className = 'member' + (member.kind === 'Officer' ? ' officer' : '');
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = member.name.split(/\s+/).map(word => word[0]).join(''); avatar.setAttribute('aria-hidden', 'true');
  const info = document.createElement('div');
  for (const [tag, cls, value] of [['h3', '', member.name], ['p', 'nickname', member.nickname], ['p', 'role', member.role]]) {
    const element = document.createElement(tag); element.className = cls; element.textContent = value; info.append(element);
  }
  card.append(avatar, info); return card;
}
for (const [index, term] of terms.entries()) {
  const suffix = term.label === '2024–2026' ? '24' : term.label === '2026–2028' ? '26' : term.label.replace('–', '-');
  const tab = document.createElement('button'); tab.id = 'tab' + suffix; tab.type = 'button'; tab.textContent = term.label; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'term' + suffix); tab.setAttribute('aria-selected', String(index === 0)); tab.tabIndex = index === 0 ? 0 : -1; tablist.append(tab);
  const panel = document.createElement('section'); panel.id = 'term' + suffix; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id); panel.tabIndex = 0; panel.classList.toggle('hidden', index !== 0);
  const heading = document.createElement('h2'); heading.className = 'title'; translatedText(heading, `${term.label} Board Members`, `${term.label} Makai pawl sungmite`); panel.append(heading);
  const members = leadership.filter(member => member.term === term.label);
  if (members.length) {
    const summary = document.createElement('p'); summary.className = 'muted'; translatedText(summary, `${members.length} members · Officers and directors`, `Pawl sungmi ${members.length} · Makaite leh vaihawmte`);
    const grid = document.createElement('div'); grid.className = 'grid'; if (index === 0) grid.id = 'members'; grid.append(...members.map(memberCard)); panel.append(summary, grid);
  } else {
    const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'The board roster for this term will be added once provided.'; panel.append(empty);
  }
  main.append(panel);
}
const termTabs = [...document.querySelectorAll('[role="tab"]')];
function selectTerm(tab) {
  for (const item of termTabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).classList.toggle('hidden', !active);
  }
}
for (const tab of termTabs) {
  tab.addEventListener('click', () => selectTerm(tab));
  tab.addEventListener('keydown', event => {
    const index = termTabs.indexOf(tab);
    const target = { ArrowLeft: (index + termTabs.length - 1) % termTabs.length, ArrowRight: (index + 1) % termTabs.length, Home: 0, End: termTabs.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    selectTerm(termTabs[target]);
    termTabs[target].focus();
  });
}
