export const FIELDS = ['region', 'year', 'households', 'area', 'price'];
export const LABELS = {region:'지역', year:'연식', households:'세대수', area:'면적', price:'가격'};
export const scoreFor = n => Math.max(0, 30 - 4 * n);
export const shownPrice = c => Math.round(c.price_manwon / 100) * 100;
export const priceText = n => `${(n / 10000).toLocaleString('ko-KR', {maximumFractionDigits:2})}억 원`;
export const valueFor = (c, key) => ({region:c.region.slice(0,2), year:c.build_year, households:c.households, area:c.area_m2, price:shownPrice(c)})[key];
export function matches(c, clue) {
  const v = valueFor(c, clue.key);
  return clue.key === 'region' ? v === clue.value : v >= clue.min && v < clue.max;
}
export function clueText(c) {
  if (c.key === 'region') return `${c.value === '11' ? '서울' : '경기'}에 있는 단지`;
  if (c.key === 'year') return `${c.min}–${c.max - 1}년 사이 준공`;
  if (c.key === 'households') return `단지 전체 ${c.min.toLocaleString('ko-KR')}세대 이상 · ${c.max.toLocaleString('ko-KR')}세대 미만`;
  if (c.key === 'area') return `전용 ${c.min}㎡ 이상 · ${c.max}㎡ 미만`;
  return `매매 추정가격 ${priceText(c.min)} 이상 · ${priceText(c.max)} 미만`;
}
export const remaining = (q, clues = q.clues) => q.cards.filter(c => clues.every(clue => matches(c, clue)));
export const answers = q => remaining(q).map(c => c.id);
export function profile(q, order = q.clues) {
  const counts = order.map((_, i) => remaining(q, order.slice(0, i+1)).length);
  const depth = counts.findIndex(n => n === answers(q).length) + 1;
  return {counts, depth, information_bits: counts.map(n => Math.log2(5/n)),
    similarity: q.cards.filter(c => !answers(q).includes(c.id)).reduce((s,c) => s+q.clues.filter(k => matches(c,k)).length,0)/(5*(5-answers(q).length))};
}
export const difficultyFor = depth => depth <= 2 ? 'easy' : depth === 3 ? 'normal' : 'hard';
const signature = c => JSON.stringify(FIELDS.map(k => valueFor(c,k)));
export function validateQuestion(q) {
  if (!q || q.cards?.length !== 5 || new Set(q.cards.map(c=>c.id)).size !== 5 || new Set(q.cards.map(c=>c.complex_id)).size !== 5) throw Error('서로 다른 단지 후보 5개가 필요합니다.');
  if (q.clues?.length !== 5 || new Set(q.clues.map(c=>c.key)).size !== 5 || !q.clues.every(c=>FIELDS.includes(c.key))) throw Error('5종 단서가 필요합니다.');
  for (const c of q.cards) {
    if (!['id','complex_id','name','region','region_label','dong_name','jibun'].every(k=>typeof c[k]==='string' && c[k].trim())) throw Error('후보 식별 정보가 필요합니다.');
    if (!['11','41'].includes(c.region.slice(0,2)) || c.market !== 'sale' || !/^\d{4}-\d{2}-\d{2}$/.test(c.reference_date)) throw Error('지역·매매 기준일을 확인하세요.');
    if (![c.price_manwon,c.area_m2].every(v=>Number.isFinite(v)&&v>0) || shownPrice(c)<=0) throw Error('양수 가격·면적이 필요합니다.');
    if (!Number.isInteger(c.households)||c.households<=0 || !Number.isInteger(c.build_year)||c.build_year<1800 || c.build_year>Number(c.reference_date.slice(0,4))) throw Error('결측·잘못된 연식 또는 세대수는 출제하지 않습니다.');
  }
  if (new Set(q.cards.map(c=>c.reference_date)).size!==1) throw Error('동일 기준일이 필요합니다.');
  const identities=q.cards.map(c=>`${c.name}/${c.region_label}/${c.dong_name}/${c.jibun}`);
  if(new Set(identities).size!==5) throw Error('후보 이름과 주소가 구분되어야 합니다.');
  for (const k of q.clues) {
    if(k.key==='region' ? !['11','41'].includes(k.value) : !Number.isFinite(k.min)||!Number.isFinite(k.max)||k.min>=k.max) throw Error('단서 조건이 올바르지 않습니다.');
    if(!q.cards.some(c=>!matches(c,k))) throw Error('정보량 없는 단서는 출제하지 않습니다.');
    // Never let a rounded label move a card across a clue boundary.
    if(k.key==='price' && q.cards.some(c=>matches(c,k)!==(c.price_manwon>=k.min&&c.price_manwon<k.max))) throw Error('가격 반올림 경계가 모호합니다.');
    if(k.key==='area' && q.cards.some(c=>matches(c,k)!==(Number(c.area_m2.toFixed(4))>=k.min&&Number(c.area_m2.toFixed(4))<k.max))) throw Error('면적 표시 경계가 모호합니다.');
  }
  const winners=remaining(q);
  if(!winners.length || winners.length===5) throw Error('정답을 특정할 수 없습니다.');
  if(new Set(winners.map(signature)).size!==1) throw Error('동점이 아닌 복수 후보가 조건을 만족합니다.');
  return answers(q);
}
export function validatePack(pack) {
  if(pack.version!=='G021-1' || pack.questions?.length<16 || new Set(pack.questions.map(q=>q.id)).size!==pack.questions.length) throw Error('문제 팩 버전을 확인하세요.');
  if(pack.questions.filter(q=>q.practice).length!==1) throw Error('연습 문제 하나가 필요합니다.');
  pack.questions.forEach(q=>{
    validateQuestion(q);
    if(q.cards.some(c=>c.reference_date!==pack.source.reference_date)) throw Error('팩 기준일이 다릅니다.');
    if(q.clues.map(c=>c.key).join()!==FIELDS.join()) throw Error('기본 단서 순서가 다릅니다.');
    if(q.difficulty!==difficultyFor(profile(q).depth)) throw Error('난이도 검증에 실패했습니다.');
  });
  for(const level of ['easy','normal','hard']) if(pack.questions.filter(q=>!q.practice&&q.difficulty===level).length<5) throw Error('난이도별 5문항이 필요합니다.');
  return pack;
}
export function random(seed) {
  let n=2166136261;
  for(const ch of String(seed)) n=Math.imul(n^ch.charCodeAt(0),16777619);
  return ()=>{n=(n+0x6D2B79F5)|0;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
export function shuffle(items,rng) {
  const out=[...items];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function permutations(a) {return a.length ? a.flatMap((x,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[x,...p])) : [[]];}
export function sessionQuestions(pack,seed,difficulty='normal',mixed=false) {
  validatePack(pack);
  if(!['easy','normal','hard'].includes(difficulty)) throw Error('난이도가 올바르지 않습니다.');
  const rng=random(`${pack.version}:${seed}:${difficulty}:${mixed}`);
  const practice=pack.questions.find(q=>q.practice);
  const selected=shuffle(pack.questions.filter(q=>!q.practice&&q.difficulty===difficulty),rng).slice(0,5);
  return [practice,...selected].map(q=>{
    const orders=mixed&&!q.practice ? permutations(q.clues).filter(o=>difficultyFor(profile(q,o).depth)===difficulty) : [q.clues];
    return {...structuredClone(q),cards:shuffle(q.cards,rng),clues:orders[Math.floor(rng()*orders.length)]};
  });
}
export function explanation(q, selectedId, opened) {
  const winning=remaining(q),selected=q.cards.find(c=>c.id===selectedId);
  const missed=q.clues.filter(k=>!matches(selected,k));
  const seen=missed.filter(k=>opened.some(o=>o.key===k.key)), unseen=missed.filter(k=>!opened.some(o=>o.key===k.key));
  return {sentence:`${winning.map(c=>c.name).join(' · ')}${winning.length>1?'는 공동정답으로,':'는'} ${q.clues.map(clueText).join(', ')} 조건을 모두 만족합니다.`,
    missed, seen, unseen,
    lesson:!missed.length ? '열어 본 조건을 함께 비교했어요. 다음에도 한 가지 특징만으로 단정하지 마세요.' : seen.length ? `선택한 집은 공개된 ${seen.map(k=>LABELS[k.key]).join('·')} 조건과 맞지 않아요. 해당 속성을 다시 비교해 보세요.` : `선택한 집은 열어 본 단서에는 맞지만, 아직 열지 않은 ${unseen.map(k=>LABELS[k.key]).join('·')} 조건에서 달라요. 후보가 여럿 남았다면 단서를 더 확인하세요.`};
}
export class Game {
  constructor(pack,seed,difficulty='normal',mixed=false,clock=()=>Math.floor(Date.now()/1000)) {
    this.questions=sessionQuestions(pack,seed,difficulty,mixed);this.seed=seed;this.index=0;this.phase='intro';this.opened=0;this.selected=null;this.records=[];
    this.clock=clock;this.startedAt=null;this.finishedAt=null;
  }
  get question(){return this.questions[this.index];}
  get total(){return this.records.filter(r=>!r.practice).reduce((s,r)=>s+r.score,0);}
  get elapsedSeconds(){return this.startedAt===null?0:Math.max(0,(this.finishedAt??Math.floor(this.clock()))-this.startedAt);}
  start(skipPractice=false){if(this.phase!=='intro')return false;if(skipPractice){this.index=1;this.startedAt=Math.floor(this.clock());}this.phase='selecting';return true;}
  reveal(){if(this.phase!=='selecting'||this.opened===5)return false;this.opened++;return true;}
  select(id){if(this.phase!=='selecting'||!this.question.cards.some(c=>c.id===id))return false;this.selected=id;return true;}
  submit(){
    if(this.phase!=='selecting'||!this.selected)return false;
    const q=this.question,correct=answers(q).includes(this.selected);
    this.records.push({question:structuredClone(q),practice:!!q.practice,selected:this.selected,opened:this.opened,correct,score:correct&&!q.practice?scoreFor(this.opened):0});
    if(this.index===5)this.finishedAt=Math.floor(this.clock());
    this.phase='result';return true;
  }
  next(){if(this.phase!=='result')return false;if(this.index===5){this.phase='summary';return true;}this.index++;if(this.index===1)this.startedAt=Math.floor(this.clock());this.phase='selecting';this.opened=0;this.selected=null;return true;}
}
