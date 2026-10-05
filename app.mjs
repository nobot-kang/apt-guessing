import {Game,LABELS,FIELDS,scoreFor,shownPrice,priceText,clueText,answers,matches,explanation,validatePack} from './engine.mjs';
import {difficultyName,modeLabel,formatTime,loadRecords,saveRecord,completedRecord,shareText,recordImage,mascotPath,mascotAlt} from './records.mjs';
const main=document.querySelector('main'),announcer=document.querySelector('#announcer');
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=v=>v.toLocaleString('ko-KR',{maximumFractionDigits:4});
const freshSeed=()=>`case-${crypto.randomUUID()}`;
let seed,difficulty='normal',mixed=false,pack,game;
const browserStorage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let recordState=loadRecords(browserStorage),currentRecord=null,selectedRecordId=recordState.records[0]?.id,sharingBusy=false;
const mascot=(pose='front',extra='')=>`<span class="mascot ${pose} ${extra}" role="img" aria-label="추리를 돕는 안경 쓴 펭귄"></span>`;
// Reused apartment illustration from G032; decorative, never evidence of a property's appearance.
const house=index=>{const i=index%3;return `<svg class="house-art" viewBox="0 0 280 130" aria-hidden="true"><path d="M18 114h244" stroke="currentColor" opacity=".2"/><path d="M${55+i*8} 112V${35-i*5}h${80+i*20}v${77+i*5}" fill="currentColor" opacity=".13"/><path d="M${55+i*8} ${35-i*5}h${80+i*20}v${77+i*5}H${55+i*8}Z" fill="none" stroke="currentColor" stroke-width="2"/>${Array.from({length:12},(_,k)=>`<path d="M${67+i*8+(k%4)*(16+i*4)} ${49-i*5+Math.floor(k/4)*19}h8v9h-8Z" fill="currentColor" opacity=".7"/>`).join('')}<path d="M${89+i*17} 112V94h16v18" fill="currentColor"/><circle cx="226" cy="84" r="16" fill="currentColor" opacity=".2"/><path d="M226 90v23" stroke="currentColor" stroke-width="2"/></svg>`;};
function selectedRecord(){return recordState.records.find(r=>r.id===selectedRecordId)||recordState.records[0];}
function recordPreview(record){
  if(!record)return '';
  const best=recordState.records.find(r=>r.difficulty===record.difficulty&&r.mixed===record.mixed);
  return `<div class="record-preview"><img src="${mascotPath(record.score)}" alt="${mascotAlt(record.score)}" width="160" height="160"><div><p class="record-mode">${esc(modeLabel(record))}${best?.id===record.id?'<span class="best-badge">이 설정의 최고 기록</span>':''}</p><strong>${record.score}<small> / 150점</small></strong><p class="record-time">${formatTime(record.elapsedSeconds)} <span>정답 ${record.rounds.filter(r=>r.correct).length}/5 · 단서 ${record.rounds.reduce((s,r)=>s+r.opened,0)}개</span></p><p class="small">${esc(new Date(record.createdAt).toLocaleString('ko-KR'))}</p></div></div>`;
}
function recordBoard(){
  return `<section class="record-board" aria-labelledby="records-title"><div class="record-heading"><div><p class="eyebrow">MY DETECTIVE RECORDS</p><h2 id="records-title">나의 기록 보관함 <span>${recordState.records.length}</span></h2></div><p>점수 우선 · 동점이면 짧은 시간 순</p></div><p class="small">이 브라우저에만 최대 100개를 저장해요. 난이도·단서 순서도 함께 기록하며, 브라우저 데이터를 지우면 사라져요.</p>${recordState.warning?`<p class="storage-warning" role="status">${esc(recordState.warning)}</p>`:''}${recordState.records.length?`<label for="record-select">공유할 기록 선택</label><select id="record-select">${recordState.records.map(r=>`<option value="${esc(r.id)}" ${r.id===selectedRecord()?.id?'selected':''}>${r.score}점 · ${formatTime(r.elapsedSeconds)} · ${esc(modeLabel(r))} · ${esc(new Date(r.createdAt).toLocaleString('ko-KR'))}</option>`).join('')}</select><div id="record-preview">${recordPreview(selectedRecord())}</div><div class="record-actions"><button class="primary" data-action="download">선택한 기록 이미지 다운로드 <span aria-hidden="true">↓</span></button><button class="secondary" data-action="share">게임 링크·기록 공유 문구 복사</button></div><p id="share-status" role="status" aria-live="polite"></p><div id="copy-fallback"></div>`:'<p class="empty-records">본 게임 5판을 마치면 점수와 시간이 자동으로 저장돼요. 나만의 최고 기록을 모아보세요.</p>'}</section>`;
}
function rememberRecord(){
  if(currentRecord||game.finishedAt===null)return;
  currentRecord=completedRecord(game,{id:crypto.randomUUID(),difficulty,mixed,createdAt:new Date(Math.floor(Date.now()/1000)*1000).toISOString(),packVersion:pack.version});
  const latest=loadRecords(browserStorage);
  const merged=[...new Map([...recordState.records,...latest.records].map(r=>[r.id,r])).values()];
  recordState=saveRecord(merged,currentRecord,browserStorage);selectedRecordId=currentRecord.id;
}
async function shareRecord(action){
  if(sharingBusy)return;
  const record=selectedRecord();if(!record)return;
  const status=main.querySelector('#share-status');sharingBusy=true;
  main.querySelectorAll('.record-actions button,#record-select').forEach(el=>{el.disabled=true;});
  try{
    if(action==='download'){
      status.textContent='선택한 기록 이미지를 만들고 있어요…';
      const blob=await recordImage(record),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`apt-guessing-${record.score}pts-${record.elapsedSeconds}s-${record.id.slice(0,8)}.png`;
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
      status.textContent=`${record.score}점 · ${formatTime(record.elapsedSeconds)} 기록 이미지를 다운로드했어요.`;
    }else{
      const text=shareText(record);
      try{
        await navigator.clipboard.writeText(text);
        status.textContent='게임 링크와 선택한 기록의 공유 문구를 복사했어요.';
        main.querySelector('#copy-fallback')?.replaceChildren();
      }catch{
        status.textContent='자동 복사가 허용되지 않았어요. 아래 문구를 직접 복사해 주세요.';
        const box=main.querySelector('#copy-fallback');if(!box)return;
        box.innerHTML='<label for="manual-copy">공유 문구</label><textarea id="manual-copy" readonly rows="5"></textarea>';
        const field=box.querySelector('textarea');field.value=text;field.focus();field.select();
      }
    }
  }catch{status.textContent='기록 이미지를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.';}
  finally{sharingBusy=false;main.querySelectorAll('.record-actions button,#record-select').forEach(el=>{el.disabled=false;});}
}
function sourceNote(){return `<details class="source-note"><summary>이 게임의 데이터는 어디에서 왔나요?</summary><p>서울·경기 기존 게임 데이터 · <strong>${esc(pack.source.reference_date)} 기준 매매 추정가격</strong>입니다. 실제 매물이나 특정 집의 감정가격이 아닙니다. 금액은 100만원 단위로 반올림하며, 내부 단위는 만원입니다.</p><p>전용면적은 모형의 기준 주택 면적, 세대수는 현재 측정한 단지 전체 세대수입니다. 연식은 기준연도 ${pack.source.reference_date.slice(0,4)}에서 준공연도를 뺀 값으로, 생일 기준 만 나이가 아닙니다. 아파트 그림은 실제 외관이 아닌 공통 게임 일러스트입니다.</p></details>`;}
function intro(){
  main.innerHTML=`<section class="intro"><div class="intro-copy"><p class="eyebrow">FIVE CLUES. ONE HOME.</p><h1 tabindex="-1">다섯 단서로<br><em>단지 찾기</em><span class="title-dot">.</span></h1><p class="lead">다섯 집 사이에 숨은 한 집.<br>단서를 하나씩 열고, 나만의 추리로 찾아보세요.</p><div class="intro-meta"><span>본 게임 5판 · 연습은 선택</span><span>약 1–3분</span><span>시간 제한 없음</span></div><div class="start-actions"><button class="primary start" data-action="skip">바로 본 게임 시작 <span aria-hidden="true">↗</span></button><button class="text-button" data-action="start">먼저 연습해 보기</button></div><p class="small">본 게임 시작부터 마지막 채점까지 초 단위로 기록해요.<br>연습 시간은 제외하고, 시간은 점수에 영향을 주지 않아요.</p></div><div class="case-art"><div class="art-label"><span>APARTMENT DETECTIVE</span><span>기록 021</span></div><div class="speech">같은 동네여도,<br>모든 조건이 같지는 않아요.</div>${mascot('angle','hero-penguin')}<span class="evidence evidence-one">지역 <b>서울일까, 경기일까?</b></span><span class="evidence evidence-two">세대수 <b>규모도 단서가 돼요</b></span><span class="art-stamp">단서 수집 중</span></div></section>
  <section class="how-to" aria-label="플레이 방법"><div><span class="step-number">01</span><h2>다섯 집을 비교해요</h2><p>카드의 지역·연식·세대수·면적·가격을<br>한눈에 살펴보세요.</p></div><div><span class="step-number">02</span><h2>필요한 만큼 단서를 열어요</h2><p>정답 집의 조건을 하나 열 때마다 −4점.<br>30점에서 시작해 다 열면 10점이에요.</p></div><div><span class="step-number">03</span><h2>한 집을 지목해요</h2><p>후보를 고른 뒤 정답을 제출하세요.<br>제출하면 변경할 수 없고, 오답은 0점이에요.</p></div></section>
  <section class="settings" aria-labelledby="settings-title"><div><p class="eyebrow">YOUR CASE FILE</p><h2 id="settings-title">오늘의 추리 방식</h2></div><label>난이도<select id="difficulty"><option value="easy">가볍게 · 초반 단서로 좁히기</option><option value="normal" selected>차근차근 · 세 단서 조합</option><option value="hard">깊이 있게 · 네다섯 단서 조합</option></select></label><label>단서 순서<select id="order"><option value="fixed">지역 → 연식 → 세대수 → 면적 → 가격</option><option value="mixed">섞어서 추리하기</option></select></label></section>${recordBoard()}${sourceNote()}`;
  main.querySelector('#difficulty').value=difficulty;main.querySelector('#order').value=mixed?'mixed':'fixed';
}
function card(c,i,q,record=null,review=false){
  const selected=(record?.selected??game.selected)===c.id,winner=record&&answers(q).includes(c.id);
  const state=record ? `${winner?'정답':''}${winner&&selected?' · ':''}${selected?'나의 선택':''}` : selected?'선택 중':'';
  const year=Number(pack.source.reference_date.slice(0,4));
  return `<article class="home-card tone-${i} ${selected?'selected':''} ${winner?'winner':''}" data-card="${i}"><div class="card-art"><span class="card-letter">${String.fromCharCode(65+i)}</span>${house(i)}<span class="card-state">${state}</span></div><div class="card-body"><p class="address">${esc(c.region_label)} · ${esc(c.dong_name)} ${esc(c.jibun)}</p><h3>${esc(c.name)}</h3><dl><div><dt>연식</dt><dd>${year-c.build_year}년차 <small>${c.build_year}년 준공</small></dd></div><div><dt>단지 전체</dt><dd>${num(c.households)}<small class="inline"> 세대</small></dd></div><div><dt>전용면적</dt><dd>${num(c.area_m2)}<small class="inline"> ㎡</small></dd></div><div class="price-row"><dt>매매 추정가격</dt><dd>${priceText(shownPrice(c))}</dd></div></dl>${!record?`<button class="choose" data-select="${i}" aria-pressed="${selected}" aria-label="후보 ${i+1}, ${esc(c.name)} 선택"><kbd>${i+1}</kbd> ${selected?'선택한 집':'이 집 선택'} <span aria-hidden="true">${selected?'✓':'+'}</span></button>`:`<p class="locked-label">${state||'비교 후보'}${review?'':' · 선택 잠김'}</p>`}</div></article>`;
}
function clues(q,opened,result=false){return `<ol class="clue-list">${q.clues.map((k,i)=>`<li class="clue ${i<opened?'opened':''} ${result&&i>=opened?'after-reveal':''}"><span class="clue-label"><span class="clue-number">${String(i+1).padStart(2,'0')}</span>${LABELS[k.key]} <small>${i<opened?'열어 봄':result?'제출 후 공개':'미공개'}</small></span><p>${i<opened||result?clueText(k):'아직 봉인된 단서'}</p></li>`).join('')}</ol>`;}
function comparison(record){
  const q=record.question,chosen=q.cards.find(c=>c.id===record.selected),winners=q.cards.filter(c=>answers(q).includes(c.id)),info=explanation(q,record.selected,q.clues.slice(0,record.opened));
  const display=(c,key)=>({region:c.region_label,year:`${c.build_year}년 준공`,households:`${num(c.households)}세대`,area:`${num(c.area_m2)}㎡`,price:priceText(shownPrice(c))})[key];
  return `<p class="answer-reason">${esc(info.sentence)}</p><div class="lesson">${mascot(record.correct?'angle':'side')}<p><strong>${record.correct?'조건들을 잘 연결했어요.':'어디에서 갈렸을까요?'}</strong>${esc(info.lesson)}</p></div><div class="comparison-wrap"><table class="comparison"><caption>나의 선택과 정답 비교</caption><thead><tr><th scope="col">판단 기준</th><th scope="col">나의 선택<br>${esc(chosen.name)}</th><th scope="col">${winners.length>1?'공동정답':'정답'}<br>${winners.map(c=>esc(c.name)).join(' · ')}</th></tr></thead><tbody>${FIELDS.map(key=>{const k=q.clues.find(k=>k.key===key),ok=matches(chosen,k);return `<tr class="${ok?'':'mismatch'}"><th scope="row">${LABELS[key]} <small>${q.clues.indexOf(k)<record.opened?'사용한 단서':'미사용 단서'}</small></th><td>${display(chosen,key)} <span class="match-word">${ok?'✓ 충족':'✕ 불일치'}</span></td><td>${[...new Set(winners.map(c=>display(c,key)))].join(' · ')}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function play(focus='h1'){
  const q=game.question,result=game.phase==='result',record=result?game.records.at(-1):null;
  main.innerHTML=`<section class="game-heading"><div><p class="eyebrow">${q.practice?'PRACTICE FILE':'CASE FILE '+String(game.index).padStart(2,'0')} <span>· ${difficultyName[q.difficulty]}</span></p><h1 tabindex="-1">${result?(record.correct?'찾았어요, 바로 이 집!':'단서를 다시 연결해 볼까요?'):'어느 집의 이야기일까요?'}</h1><p>${q.practice?'연습 사건 · 점수 걱정 없이 단서를 열어 보세요.':`다섯 집을 비교하고, 조건을 모두 만족하는 한 집을 찾아보세요.`}</p></div><div class="round-status"><div class="progress-dots" aria-label="${q.practice?'연습 중':`5판 중 ${game.index}판`}">${Array.from({length:5},(_,i)=>`<span class="${i+1<game.index?'done':i+1===game.index?'current':''}">${i+1<game.index?'✓':i+1}</span>`).join('')}</div><span>누적 점수 <strong>${game.total}</strong> / 150</span></div></section>
  <div class="board-heading"><h2>다섯 후보 <span>카드의 숫자가 추리의 근거예요</span></h2><span>매매 추정가격 · ${pack.source.reference_date}</span></div><section class="candidate-grid" aria-label="후보 집 5개">${q.cards.map((c,i)=>card(c,i,q,record)).join('')}</section>
  <section class="notebook" aria-labelledby="clue-title"><div class="notebook-heading"><div><span class="eyebrow">DETECTIVE NOTES</span><h2 id="clue-title">정답 집의 다섯 단서</h2></div><div class="clue-counter">열어 본 단서 <strong>${game.opened}</strong> / 5</div></div>${clues(q,game.opened,result)}${!result?`<div class="action-bar"><div class="guide-inline">${mascot(game.opened===0?'back':game.opened<3?'side':'angle')}<p>${q.practice&&game.opened===0?'먼저 지역 단서를 열고 카드와 비교해 보세요.':game.opened===5?'모든 단서를 열었어요. 조건을 함께 비교해 보세요.':'한 조건에 맞더라도, 다른 조건은 다를 수 있어요.'}</p></div><button data-action="clue" class="secondary" ${game.opened===5?'disabled':''}>${game.opened===5?'단서 모두 확인':`다음 단서 열기 · ${LABELS[q.clues[game.opened].key]}`} <kbd>H</kbd><small>−4점</small></button></div>`:''}</section>
  ${result?`<section class="result-panel" aria-labelledby="result-title"><div class="result-title"><div><p class="eyebrow">CASE ${record.correct?'SOLVED':'REVIEW'}</p><h2 id="result-title" tabindex="-1">${q.practice?'연습 완료':record.correct?'추리 성공':'이번 사건은 오답'} <span>${q.practice?'본 점수 제외':`+${record.score}점`}</span></h2></div><button class="primary" data-action="next">${q.practice?'본 게임 시작하기':game.index===5?'최종 결과 보기':'다음 사건으로'} <span aria-hidden="true">→</span></button></div>${comparison(record)}</section>`:`<section class="submit-bar"><div><span>${q.practice?'연습 · 정답이면':'지금 맞히면'} <strong>${scoreFor(game.opened)}점</strong></span><small>${q.practice?'본 점수에는 포함되지 않아요':'30 − 4 × '+game.opened+'개 단서 · 오답은 0점'}</small></div><div class="submit-action"><p>${game.selected?`${esc(q.cards.find(c=>c.id===game.selected).name)} 선택 중`:'후보 한 집을 골라 주세요'}</p><button class="primary" data-action="submit" ${!game.selected?'disabled':''}>이 집으로 정답 제출 <span aria-hidden="true">→</span></button><small>제출 후에는 선택을 바꿀 수 없어요.</small></div></section><p class="keyboard-help">키보드 <kbd>1</kbd>–<kbd>5</kbd> 후보 선택 <span>·</span> <kbd>H</kbd> 단서 열기 <span>·</span> <kbd>Enter</kbd> 선택한 집 제출 <span>·</span> 버튼은 Tab으로 이동</p>`}${sourceNote()}`;
  if(focus)main.querySelector(focus)?.focus({preventScroll:focus!=='#result-title'&&focus!=='h1'});
}
function summary(){
  const records=game.records.filter(r=>!r.practice),wrong=records.filter(r=>!r.correct);
  main.innerHTML=`<section class="summary-hero"><div><p class="eyebrow">TODAY'S CASES, CLOSED.</p><h1 tabindex="-1">오늘의 추리 기록</h1><p>다섯 사건을 끝까지 살펴봤어요.</p><div class="final-score">${game.total}<span> / 150점</span></div><div class="summary-stats"><span>정답 <strong>${5-wrong.length} / 5</strong></span><span>사용한 단서 <strong>${records.reduce((s,r)=>s+r.opened,0)}개</strong></span><span>완료 시간 <strong>${formatTime(game.elapsedSeconds)}</strong></span><span>${difficultyName[difficulty]} · ${mixed?'섞은 순서':'기본 순서'}</span></div></div><div class="summary-mascot"><img src="${mascotPath(game.total)}" alt="${mascotAlt(game.total)}" width="240" height="240"><p>한 가지 특징보다,<br><strong>여러 조건을 함께!</strong></p></div></section><div class="round-results">${records.map((r,i)=>`<div class="${r.correct?'hit':'miss'}"><span>사건 ${i+1} · ${r.correct?'정답':'오답'}</span><strong>${r.score}<small>점</small></strong><small>단서 ${r.opened}개 사용</small></div>`).join('')}</div><div class="replay-bar"><button class="primary" data-action="replay">새 사건으로 다시 추리 <span aria-hidden="true">↗</span></button><button class="text-button" data-action="settings">난이도·순서 바꾸기</button></div>${recordBoard()}<section class="review" aria-labelledby="review-title"><div class="section-heading"><div><p class="eyebrow">LOOK BACK, LEARN MORE.</p><h2 id="review-title">놓친 단서 다시 보기 <span>${wrong.length}</span></h2></div><p>틀린 문제의 선택과 근거를 차분히 비교해 보세요.</p></div>${wrong.length?wrong.map((r,i)=>`<details class="review-case" ${i===0?'open':''}><summary>사건 ${records.indexOf(r)+1} · ${esc(r.question.cards.find(c=>c.id===r.selected).name)} 선택 <span>단서 ${r.opened}개 사용 · 0점</span></summary><div class="review-body">${clues(r.question,r.opened,true)}<div class="candidate-grid">${r.question.cards.map((c,j)=>card(c,j,r.question,r,true)).join('')}</div>${comparison(r)}</div></details>`).join(''):`<div class="all-clear">${mascot('angle')}<p><strong>놓친 사건이 없어요.</strong>다섯 집의 차이를 끝까지 잘 짚었어요. 다음에는 단서 순서를 바꿔 도전해 보세요.</p></div>`}</section>${sourceNote()}`;
  main.querySelector('h1').focus();
}
function announce(message){announcer.textContent=message;}
function beginGame(skipPractice){
  let nextSeed;do{nextSeed=freshSeed();}while(nextSeed===seed);seed=nextSeed;
  currentRecord=null;game=new Game(pack,seed,difficulty,mixed);game.start(skipPractice);play();
}
function dispatch(action){
  if(action==='start'||action==='skip'){
    difficulty=main.querySelector('#difficulty').value;mixed=main.querySelector('#order').value==='mixed';
    beginGame(action==='skip');return;
  }
  if(action==='download'||action==='share'){void shareRecord(action);return;}
  if(action==='clue'&&game.reveal()){const k=game.question.clues[game.opened-1];play('[data-action="clue"]');if(game.opened===5)main.querySelector('[data-select="0"]').focus({preventScroll:true});announce(`${LABELS[k.key]} 단서: ${clueText(k)}. ${game.opened}개 사용, 정답이면 ${scoreFor(game.opened)}점.`);}
  if(action==='submit'&&game.submit()){rememberRecord();play('#result-title');announce(`${game.records.at(-1).correct?'정답':'오답'}입니다. ${game.question.practice?'연습 점수는 제외됩니다.':game.records.at(-1).score+'점 획득.'}`);}
  if(action==='next'&&game.next()){game.phase==='summary'?summary():play();}
  if(['replay','settings'].includes(action)&&game.phase==='summary'){
    if(action==='settings'){intro();main.querySelector('h1').focus();return;}
    beginGame(true);
  }
}
main.addEventListener('change',event=>{
  if(event.target.id!=='record-select')return;
  selectedRecordId=event.target.value;main.querySelector('#record-preview').innerHTML=recordPreview(selectedRecord());
  main.querySelector('#share-status').textContent='';main.querySelector('#copy-fallback').replaceChildren();
});
main.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.select!==undefined){const i=Number(button.dataset.select);if(game.select(game.question.cards[i].id)){play(`[data-select="${i}"]`);announce(`${game.question.cards[i].name} 선택. 정답 제출 버튼으로 확정하세요.`);}}
  else if(button.dataset.action)dispatch(button.dataset.action);
});
document.addEventListener('keydown',event=>{
  if(!game||event.repeat||event.altKey||event.ctrlKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
  if(game.phase==='selecting'){
    if(/^[1-5]$/.test(event.key)){event.preventDefault();const i=Number(event.key)-1;game.select(game.question.cards[i].id);play(`[data-select="${i}"]`);announce(`${game.question.cards[i].name} 선택.`);}
    else if(event.key.toLowerCase()==='h'){event.preventDefault();dispatch('clue');}
    else if(event.key==='Enter'&&game.selected&&(event.target.dataset.select!==undefined||!['BUTTON','SUMMARY','A'].includes(event.target.tagName))){event.preventDefault();dispatch('submit');}
  }
});
try{const response=await fetch('./pack.json');if(!response.ok)throw Error('문제 팩을 불러오지 못했습니다.');pack=validatePack(await response.json());intro();}
catch(error){main.innerHTML=`<section class="error"><h1>사건 파일을 열 수 없어요</h1><p>${esc(error.message)}</p><p>HTTP 서버에서 게임을 열고 pack.json 파일을 확인해 주세요.</p><a href="./">다시 불러오기</a></section>`;}
