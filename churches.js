const churches=[
['Bethel EBC','Rev. Zam Cin Kap'],
['Bethel UPC','Pastor Suan Go Cin'],
['Bethel Worship Center','Rev. Kap Lian Tuang'],
['EBC Tulsa','Rev. Lian Za Tuang'],
['Far East Mission Church','Rev. Dr. Cin Khaw Kham'],
['Full Gospel Assembly International','Rev. Dr. Dam Suan Mung'],
['Full Life Church','Rev. Dr. Nang Khen Khup'],
['Gateway International Church','Rev. Dr. Suan Za Lian'],
['Hosanna Mission Church','Pastor Thawng Kim'],
['Laipian Pasian Paaina Pawlpi','Pa Haupi'],
['Myanmar Adventist Fellowship','Sia Lianno'],
['Myanmar Christian Church','Rev. Dr. Kham Khan Khai'],
['Myanmar Zomi Baptist Church','Pastor Hau Suan Khai'],
['Shalom Baptist Church','Pastor Sangpi'],
['St. Catherine of Alexandria','Father. Robert Kim Pu'],
['Tulsa Baptist Church','Sia Paubawi'],
['ZBCM of Tulsa','Rev. Dr. Ngo Suanthang Guite'],
['Zomi SDA Tulsa','Pastor Thlenga']
];
const input=document.getElementById('church-search'),grid=document.getElementById('church-grid');
function renderChurches(){const q=input.value.trim().toLowerCase(),matches=churches.filter(row=>row.join(' ').toLowerCase().includes(q));grid.replaceChildren();document.getElementById('church-count').textContent=matches.length+' / '+churches.length;document.getElementById('church-empty').hidden=matches.length>0;for(const [name,pastor] of matches){const card=document.createElement('article');card.className='church';const title=document.createElement('h2');title.textContent=name;const label=document.createElement('div');label.className='pastor-label';label.textContent='Church Pastor';const lead=document.createElement('p');lead.textContent=pastor;card.append(title,label,lead);grid.append(card)}}input.addEventListener('input',renderChurches);renderChurches();
