/* Publiczny renderer turnieju. Wymaga supabase-config.js oraz Supabase JS v2. */
(()=>{
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const db=window.supabase?.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
 const root=document.getElementById('tournamentPublic'); if(!db||!root)return;
 const fmt=n=>Number.isFinite(+n)?+n:0;
 const pageKind=location.pathname.toLowerCase().endsWith('bracket.html')?'bracket':'results';
 let teamLogosById={},teamLogosByName={};
 const teamLogo=(id,name)=>{const url=teamLogosById[id]||teamLogosByName[String(name||'').trim().toLocaleLowerCase('pl-PL')];return url?`<img class="table-team-logo" src="${safe(url)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:`<span class="table-team-logo-placeholder">${safe(String(name||'?').slice(0,1).toUpperCase())}</span>`};
 const teamCell=(id,name)=>`<span class="table-team-cell">${teamLogo(id,name)}<span>${safe(name)}</span></span>`;
 const mapNamesLine=m=>{const names=[...new Set((m.maps||[]).map(x=>String(x?.name||'').trim()).filter(Boolean))];return names.length?`<small class="result-map-names">MAPY: ${names.map(safe).join(' · ')}</small>`:''};
 function calc(state){return (state.groups||[]).map(g=>{const rows=g.teams.map(t=>({id:t.id,name:t.name,M:0,W:0,R:0,P:0,rf:0,ra:0,Pkt:0}));
  (state.matches||[]).filter(m=>m.group===g.name&&m.played).forEach(m=>{const a=rows.find(x=>x.id===m.team1Id),b=rows.find(x=>x.id===m.team2Id);if(!a||!b)return;a.M++;b.M++;const mapsA=(m.maps||[]).filter(x=>x.a!==null&&x.b!==null).reduce((s,x)=>s+(x.a>x.b?1:0),0);const mapsB=(m.maps||[]).filter(x=>x.a!==null&&x.b!==null).reduce((s,x)=>s+(x.b>x.a?1:0),0);if(mapsA>mapsB){a.W++;b.P++}else if(mapsB>mapsA){b.W++;a.P++}else{a.R++;b.R++}a.Pkt+=mapsA;b.Pkt+=mapsB;(m.maps||[]).forEach(x=>{a.rf+=fmt(x.a);a.ra+=fmt(x.b);b.rf+=fmt(x.b);b.ra+=fmt(x.a)})});
  rows.forEach(r=>{r.diff=r.rf-r.ra;const o=state.standingsOverrides?.[r.id];if(o){['M','W','R','P','rf','ra','Pkt'].forEach(k=>{if(o[k]!==undefined&&o[k]!==null)r[k]=fmt(o[k])});r.diff=r.rf-r.ra}});
  if(Array.isArray(state.playoffs)&&state.playoffs.length){rows.sort((a,b)=>b.Pkt-a.Pkt||b.diff-a.diff||b.rf-a.rf||a.name.localeCompare(b.name,'pl'));}return {name:g.name,rows};});}
 function render(state){
  const groups=calc(state);
  let html='';
  const playoffMatches=Array.isArray(state.playoffs)?state.playoffs:[];
  const finalStandings=Array.isArray(state.finalStandings)?state.finalStandings:[];
  const labels={R16:'1/8 FINAŁU',QF:'ĆWIERĆFINAŁY',SF:'PÓŁFINAŁY',FINAL:'WIELKI FINAŁ',THIRD:'MECZ O 3. MIEJSCE'};
  const order=['R16','QF','SF','THIRD','FINAL'];

  if(pageKind==='bracket'){
   html+='<div class="public-playoffs">';
   html+='<div class="head"><div><div class="eyebrow">DECYDUJĄCE MECZE</div><h2>FAZA PUCHAROWA</h2><p>Drabinka turniejowa · BO3</p></div></div>';
   if(playoffMatches.length){
    html+='<div class="playoff-rounds">';
    order.filter(r=>playoffMatches.some(m=>m.round===r)).forEach(r=>{
     html+=`<section class="panel playoff-round"><h3>${labels[r]}</h3><div class="results">`;
     playoffMatches.filter(m=>m.round===r).sort((a,b)=>a.index-b.index).forEach(m=>{
      const score=(m.maps||[]).filter(x=>x&&x.a!==null&&x.b!==null).map(x=>`${x.a}:${x.b}`).join(' / ');
      html+=`<div class="result"><div><small>${m.date?safe(m.date+' · '+(m.time||'')):'Termin do ustalenia'}</small><strong class="result-teams">${teamCell(m.team1Id,m.team1||'Oczekuje na drużynę')}<span class="versus">VS</span>${teamCell(m.team2Id,m.team2||'Oczekuje na drużynę')}</strong>${m.winnerName?`<small>AWANS: ${safe(m.winnerName)}</small>`:''}</div><div class="result-scoreblock"><div class="scorebig">${score||'—'}</div>${mapNamesLine(m)}</div></div>`;
     });
     html+='</div></section>';
    });
    html+='</div>';
   }else{
    html+='<div class="panel"><p class="note">Faza pucharowa pojawi się tutaj po zakończeniu fazy grupowej i utworzeniu drabinki przez administratora.</p></div>';
   }
   html+='</div>';
   if(state.playoffsClosed&&finalStandings.length){
    html+='<section class="panel final-standings"><div class="eyebrow">OFICJALNE WYNIKI</div><h2>KLASYFIKACJA KOŃCOWA</h2><ol class="final-standings-list">'+finalStandings.slice().sort((a,b)=>a.place-b.place).map(r=>`<li><span class="final-place">${fmt(r.place)}.</span><strong>${safe(r.name)}</strong>${r.place===1?'<span class="champion-tag">MISTRZ</span>':''}</li>`).join('')+'</ol></section>';
   }
   root.innerHTML=html;
   return;
  }

  // Strona WYNIKI zawiera wyłącznie fazę grupową — bez meczów pucharowych.
  if(!groups.length){root.innerHTML='<div class="panel"><p class="note">Faza grupowa nie została jeszcze skonfigurowana.</p></div>';return;}
  html+='<div class="head"><div><div class="eyebrow">ROZEGRANE SPOTKANIA</div><h2>WYNIKI FAZY GRUPOWEJ</h2><p>Tabele grupowe, rezultaty spotkań i drużyny z awansem.</p></div></div>';
  html+='<h3>TABELE GRUPOWE</h3><div class="group-tables">';
  groups.forEach(g=>{html+=`<div class="panel group-table"><h3>${safe(g.name)}</h3><div class="table-scroll"><table><thead><tr><th>Drużyna</th><th>M</th><th>W</th><th>R</th><th>P</th><th>Rundy</th><th>Pkt</th></tr></thead><tbody>${g.rows.map(r=>`<tr><td>${teamCell(r.id,r.name)}</td><td>${r.M}</td><td>${r.W}</td><td>${r.R}</td><td>${r.P}</td><td>${r.rf}:${r.ra}</td><td><b>${r.Pkt}</b></td></tr>`).join('')}</tbody></table></div><p class="note">Awans: dwie najlepsze drużyny.</p></div>`});
  html+='</div>';
  const groupMatches=(state.matches||[]).filter(m=>m.stage==='group'||m.group);
  const matchGroups=[];
  const addMatchGroup=name=>{if(!matchGroups.some(g=>g.name===name))matchGroups.push({name,matches:[]});};
  (state.groups||[]).forEach(g=>addMatchGroup(String(g.name||'FAZA GRUPOWA')));
  groupMatches.forEach(m=>addMatchGroup(String(m.group||'FAZA GRUPOWA')));
  matchGroups.forEach(g=>{g.matches=groupMatches.filter(m=>String(m.group||'FAZA GRUPOWA')===g.name);});

  html+='<style>.group-matches{display:grid;gap:18px}.group-matches-panel{padding:18px 20px;margin:0}.group-matches-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.09)}.group-matches-heading h3{margin:3px 0 0;font-size:18px;letter-spacing:.08em;text-transform:uppercase}.group-matches-heading>small{color:var(--muted,#999);white-space:nowrap}.group-matches-panel .results{display:grid;grid-template-columns:minmax(0,1fr);gap:9px;width:100%}.group-matches-panel .result{display:flex;align-items:center;justify-content:space-between;gap:20px;width:calc(100% - 16px);min-width:0;min-height:82px;box-sizing:border-box;border:1px solid rgba(255,255,255,.12)!important;border-radius:7px!important;margin:8px!important;padding:20px 18px!important;overflow:visible;line-height:1.6;background:#19191f!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}.group-matches-panel .result>div:first-child{flex:1;min-width:0}.group-matches-panel .result-teams{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0;margin-top:0;overflow:visible;line-height:1.45}.group-matches-panel .table-team-cell{display:inline-flex!important;align-items:center!important;gap:8px;min-width:0;overflow:visible;line-height:1.45}.group-matches-panel .table-team-cell>span{display:inline-block;line-height:1.6;padding:2px 0;overflow:visible}.group-matches-panel img.table-team-logo,.group-matches-panel .table-team-logo{display:block!important;width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;max-width:28px!important;max-height:28px!important;object-fit:cover;flex:0 0 28px;border-radius:5px;overflow:visible}.group-matches-panel .table-team-logo-placeholder{display:inline-flex!important;align-items:center;justify-content:center;width:28px;height:28px;min-width:28px;flex:0 0 28px;line-height:1}.group-matches-panel .result-scoreblock{flex:0 0 auto;max-width:42%;min-width:130px;display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}.group-matches-panel .result-scoreblock .result-scheduled-date{display:block;max-width:100%;font-family:Oswald,sans-serif!important;font-size:16px!important;font-weight:800!important;color:#f2b233!important;white-space:normal;line-height:1.6;padding:3px 0;text-transform:uppercase;letter-spacing:.02em;overflow:visible}.group-matches-panel .result-match-date{font-size:10px;color:var(--muted,#aaa);margin:2px 0 0}.group-matches-panel .result:first-child{padding-top:18px}.group-matches-panel .result:last-child{padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.10)!important}@media(max-width:650px){.group-matches-panel .result{align-items:flex-start;flex-direction:column;gap:8px}.group-matches-panel .result-scoreblock{max-width:100%;min-width:0;align-items:flex-start;text-align:left}.group-matches-panel .result-scheduled-date{font-size:12px}}</style>';
  html+='<h3 style="margin-top:28px">MECZE GRUPOWE</h3><div class="group-matches">';
  matchGroups.filter(g=>g.matches.length).forEach(g=>{
   html+=`<section class="panel group-matches-panel"><div class="group-matches-heading"><div><div class="eyebrow">FAZA GRUPOWA</div><h3>${safe(g.name)}</h3></div><small>${g.matches.length} ${g.matches.length===1?'MECZ':(g.matches.length%10>=2&&g.matches.length%10<=4&&!(g.matches.length%100>=12&&g.matches.length%100<=14)?'MECZE':'MECZÓW')}</small></div><div class="results">`;
   g.matches.forEach(m=>{const score=m.played?(m.maps||[]).filter(x=>x&&x.a!==null&&x.b!==null).map(x=>`${x.a}:${x.b}`).join(' / '):'';const matchDate=m.date?safe(m.date+(m.time?' · '+m.time:'')):'Termin do ustalenia';html+=`<div class="result"><div><strong class="result-teams">${teamCell(m.team1Id,m.team1)}<span class="versus">VS</span>${teamCell(m.team2Id,m.team2)}</strong></div><div class="result-scoreblock">${m.played?`<div class="scorebig">${score||'—'}</div>${mapNamesLine(m)}<small class="result-match-date">${matchDate}</small>`:`<div class="scorebig result-scheduled-date">${matchDate}</div>`}</div></div>`;});
   html+='</div></section>';
  });
  html+='</div>';
  const allDone=(state.matches||[]).filter(m=>m.stage==='group'||m.group).length>0&&(state.matches||[]).filter(m=>m.stage==='group'||m.group).every(m=>m.played);
  if(allDone){const qualifiers=groups.flatMap(g=>g.rows.slice(0,2).map((r,i)=>({...r,group:g.name,place:i+1})));html+='<h3 style="margin-top:28px">AWANS DO FAZY PUCHAROWEJ</h3><div class="teamlist">'+qualifiers.map(q=>`<div class="teamcard"><div><small>${safe(q.group)} · ${q.place}. MIEJSCE</small><strong class="result-teams">${teamCell(q.id,q.name)}</strong></div></div>`).join('')+'</div>';}
  root.innerHTML=html;
 }
 Promise.all([db.from('tournament_state').select('state').eq('id',1).maybeSingle(),db.from('teams').select('id,name,logo_url').eq('status','approved')]).then(([stateRes,teamsRes])=>{if(stateRes.error){root.textContent='Nie udało się pobrać danych turnieju: '+stateRes.error.message;return}if(!teamsRes.error){(teamsRes.data||[]).forEach(t=>{if(t.logo_url){teamLogosById[t.id]=t.logo_url;teamLogosByName[String(t.name||'').trim().toLocaleLowerCase('pl-PL')]=t.logo_url;}})}render(stateRes.data?.state||{});}).catch(e=>{root.textContent='Nie udało się pobrać danych turnieju: '+e.message;});
})();
