const status=document.querySelector('#data-status');
try{
  const response=await fetch('./pack.json');if(!response.ok)throw Error('data');
  const pack=await response.json(),date=pack.source.reference_date;
  const count=new Set(pack.questions.flatMap(q=>q.cards.map(c=>c.id))).size;
  status.textContent=`가격 기준일 ${date} · 연습 포함 ${pack.questions.length}문항 · ${count}개 주택 카드`;
}catch{status.textContent='데이터 기준을 불러오지 못했어요. 게임 화면의 기준일을 확인해 주세요.';}
