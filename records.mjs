import {scoreFor} from './engine.mjs';
export const GAME_NAME = '다섯 단서로 단지 찾기';
export const GAME_URL = 'https://nobot-kang.github.io/apt-guessing/';
export const STORAGE_KEY = 'apt-guessing.records.v1';
export const MAX_RECORDS = 100;
export const difficultyName = {easy:'가볍게',normal:'차근차근',hard:'깊이 있게'};
export const modeLabel = r => `${difficultyName[r.difficulty]} · ${r.mixed?'섞은 순서':'기본 순서'}`;
export const mascotMood = score => score>100?'smile':score>50?'neutral':'sad';
export const mascotPath = score => `./assets/mascot-${mascotMood(score)}.webp`;
export const CHARACTER_RIGHTS='펭귄 캐릭터 ‘또박’ © 2026 Nobot Kang. All rights reserved.';
export const mascotAlt = score => score>100?'활짝 웃는 펭귄 마스코트':score>50?'평범한 표정의 펭귄 마스코트':'시무룩한 펭귄 마스코트';
export const formatTime = seconds => `${Math.floor(seconds/60)}분 ${String(seconds%60).padStart(2,'0')}초`;
export function validRecord(r) {
  return Boolean(r && typeof r.id==='string' && /^[a-zA-Z0-9-]{1,80}$/.test(r.id) &&
    Number.isSafeInteger(r.elapsedSeconds) && r.elapsedSeconds>=0 &&
    Number.isInteger(r.score) && r.score>=0 && r.score<=150 &&
    Object.hasOwn(difficultyName,r.difficulty) && typeof r.mixed==='boolean' &&
    typeof r.createdAt==='string' && Number.isFinite(Date.parse(r.createdAt)) &&
    typeof r.packVersion==='string' && typeof r.seed==='string' &&
    Array.isArray(r.rounds) && r.rounds.length===5 &&
    r.rounds.every(x=>x && typeof x.id==='string' && Number.isInteger(x.opened) && x.opened>=0 && x.opened<=5 && typeof x.correct==='boolean' && x.score===(x.correct?scoreFor(x.opened):0)) &&
    new Set(r.rounds.map(x=>x.id)).size===5 &&
    r.score===r.rounds.reduce((s,x)=>s+x.score,0));
}
export function rankRecords(records) {
  return records.filter(validRecord).sort((a,b)=>b.score-a.score||a.elapsedSeconds-b.elapsedSeconds||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
}
export function loadRecords(storage) {
  try {
    const raw=storage.getItem(STORAGE_KEY);if(!raw)return {records:[],warning:''};
    const parsed=JSON.parse(raw);if(!Array.isArray(parsed))throw Error('invalid');
    const valid=parsed.filter(validRecord),unique=[...new Map(valid.map(r=>[r.id,r])).values()];
    return {records:rankRecords(unique).slice(0,MAX_RECORDS),warning:valid.length===parsed.length?'':'읽을 수 없는 기록 일부를 제외했어요.'};
  } catch {return {records:[],warning:'브라우저 기록을 읽지 못했어요. 이번 기록은 현재 화면에서 확인할 수 있어요.'};}
}
export function saveRecord(records,record,storage) {
  if(!validRecord(record))throw Error('완료된 5판 기록만 저장할 수 있어요.');
  const ranked=rankRecords([...records.filter(r=>r.id!==record.id),record]);
  // Keep the latest result and each settings group's best even at capacity.
  const retained=new Map([[record.id,record]]);
  for(const difficulty of Object.keys(difficultyName))for(const mixed of [false,true]){
    const best=ranked.find(r=>r.difficulty===difficulty&&r.mixed===mixed);if(best)retained.set(best.id,best);
  }
  for(const r of ranked){if(retained.size>=MAX_RECORDS)break;retained.set(r.id,r);}
  const result=rankRecords([...retained.values()]);
  try{storage.setItem(STORAGE_KEY,JSON.stringify(result));return {records:result,warning:''};}
  catch{return {records:result,warning:'브라우저에 저장하지 못했어요. 이 화면을 닫기 전에 기록 이미지를 내려받아 주세요.'};}
}
export function completedRecord(game,{id,difficulty,mixed,createdAt,packVersion}) {
  if(game.finishedAt===null || !['result','summary'].includes(game.phase))throw Error('아직 본 게임이 끝나지 않았어요.');
  const record={id,score:game.total,elapsedSeconds:game.elapsedSeconds,difficulty,mixed,createdAt,packVersion,seed:game.seed,
    rounds:game.records.filter(r=>!r.practice).map(r=>({id:r.question.id,opened:r.opened,correct:r.correct,score:r.score}))};
  if(!validRecord(record))throw Error('완료된 기록이 올바르지 않아요.');
  return record;
}
export function shareText(record) {
  if(!validRecord(record))throw Error('기록을 확인해 주세요.');
  return `${GAME_NAME}\n나의 기록 ${record.score}/150점 · ${formatTime(record.elapsedSeconds)}\n${modeLabel(record)} · 정답 ${record.rounds.filter(r=>r.correct).length}/5\n다섯 집, 다섯 단서! 적은 단서로 숨은 한 집을 찾아보세요. 당신의 부동산 추리력은 몇 점인가요?\n${GAME_URL}`;
}
export async function recordImage(record) {
  if(!validRecord(record))throw Error('기록을 확인해 주세요.');
  await document.fonts.ready;
  const mascot=new Image();mascot.src=new URL(mascotPath(record.score),import.meta.url).href;await mascot.decode();
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=680;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('이미지를 만들 수 없어요.');
  const ink='#213d3d',muted='#5f6e69',teal='#146355';
  ctx.fillStyle='#f6f5ef';ctx.fillRect(0,0,1000,680);
  ctx.fillStyle=teal;ctx.fillRect(0,0,1000,12);
  const text=(content,x,y,size,color=ink,weight='700')=>{
    ctx.fillStyle=color;ctx.font=`${weight} ${size}px Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;ctx.fillText(content,x,y);
  };
  text('APARTMENT DETECTIVE / MY RECORD',48,57,14,teal);
  text(GAME_NAME,46,109,40);
  text(modeLabel(record),50,153,20,muted,'400');
  ctx.fillStyle='#e7efe7';ctx.beginPath();ctx.roundRect(575,181,377,286,24);ctx.fill();
  ctx.drawImage(mascot,596,151,330,330);
  text(String(record.score),43,305,116,teal);text('/ 150점',300,300,30,muted,'400');
  text(formatTime(record.elapsedSeconds),51,366,37);
  text(`정답 ${record.rounds.filter(r=>r.correct).length}/5 · 단서 ${record.rounds.reduce((s,r)=>s+r.opened,0)}개 사용`,52,411,20,muted,'400');
  record.rounds.forEach((r,i)=>{
    const x=52+i*95;ctx.fillStyle=r.correct?'#e7efe7':'#f6e8dd';ctx.beginPath();ctx.roundRect(x,433,84,38,7);ctx.fill();
    text(`${i+1}판 ${r.score}점`,x+10,458,14,r.correct?teal:'#a44937');
  });
  ctx.strokeStyle='#d7dbcf';ctx.beginPath();ctx.moveTo(48,498);ctx.lineTo(952,498);ctx.stroke();
  text('다섯 집, 다섯 단서. 당신의 추리력은?',50,540,26);
  text('적은 단서로 숨은 한 집을 찾아보세요!',50,576,21,muted,'400');
  text(GAME_URL,50,621,23,teal);
  const date=new Date(record.createdAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  text(date,50,655,14,muted,'400');
  ctx.textAlign='right';text(CHARACTER_RIGHTS,952,655,12,muted,'400');ctx.textAlign='left';
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('이미지를 만들지 못했어요.')),'image/png'));
}
