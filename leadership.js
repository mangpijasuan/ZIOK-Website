const members=[['Cin Hatlang','Mangsen','Chairman'],['Tual Pau','Pautawng Hatlang','Vice Chairman'],['Mangpi Jasuan','Mangpi','Secretary'],['Dim Cing','Lun Cing','Assistant Secretary'],['Dim Nuam','Nuampi','Treasurer'],['Kham Niang','Niangniang','Assistant Treasurer'],['Tuang Gualnam','Lianbawi','Director of Genvai'],['Andrew Nun','Nunpi','Director of Sports'],['Dal Kham','Khampu','Director of Media'],['Suan Lun','Suihlun','Assistant Director of Music'],['Thang Piang','Sb Tungpi','Assistant Director of Genvai'],['Cin Zang','Cyi Zang','Public Relations'],['Sian Niang','Mingmawi','Director of Music'],['Lun Siam','Siamnu','Assistant Director of Media']];const grid=document.getElementById('members');members.forEach(([name,nickname,role],i)=>{let card=document.createElement('article');card.className='member'+(i<6?' officer':'');let avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=name.split(' ').map(x=>x[0]).join('');avatar.setAttribute('aria-hidden','true');let info=document.createElement('div');for(const [tag,cls,value] of [['h3','',name],['p','nickname',nickname],['p','role',role]]){let e=document.createElement(tag);e.className=cls;e.textContent=value;info.append(e)}card.append(avatar,info);grid.append(card)});
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
