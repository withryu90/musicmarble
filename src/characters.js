// Sprite cells are ordered left-to-right across the top row, then the bottom row.
const groups=[
  ['classical-founders',[
    ['bach','바흐','Johann Sebastian Bach'],['handel','헨델','George Frideric Handel'],['vivaldi','비발디','Antonio Vivaldi'],
    ['haydn','하이든','Joseph Haydn'],['mozart','모차르트','Wolfgang Amadeus Mozart'],['beethoven','베토벤','Ludwig van Beethoven'],
  ]],
  ['romantic-pioneers',[
    ['schubert','슈베르트','Franz Schubert'],['chopin','쇼팽','Frédéric Chopin'],['schumann','슈만','Robert Schumann'],
    ['mendelssohn','멘델스존','Felix Mendelssohn'],['liszt','리스트','Franz Liszt'],['clara-schumann','클라라 슈만','Clara Schumann'],
  ]],
  ['romantic-masters',[
    ['wagner','바그너','Richard Wagner'],['verdi','베르디','Giuseppe Verdi'],['brahms','브람스','Johannes Brahms'],
    ['tchaikovsky','차이콥스키','Pyotr Ilyich Tchaikovsky'],['dvorak','드보르자크','Antonín Dvořák'],['grieg','그리그','Edvard Grieg'],
  ]],
  ['romantic-voices',[
    ['saint-saens','생상스','Camille Saint-Saëns'],['bizet','비제','Georges Bizet'],['mussorgsky','무소륵스키','Modest Mussorgsky'],
    ['fanny-mendelssohn','파니 멘델스존','Fanny Mendelssohn'],['rachmaninoff','라흐마니노프','Sergei Rachmaninoff'],['boulanger','릴리 불랑제','Lili Boulanger'],
  ]],
  ['modern-explorers',[
    ['debussy','드뷔시','Claude Debussy'],['ravel','라벨','Maurice Ravel'],['satie','사티','Erik Satie'],
    ['stravinsky','스트라빈스키','Igor Stravinsky'],['schoenberg','쇤베르크','Arnold Schoenberg'],['gershwin','거슈윈','George Gershwin'],
  ]],
];
export const CHARACTERS=groups.flatMap(([sheet,people])=>people.map(([id,name,fullName],slot)=>({id,name,fullName,sheet,slot,asset:`./src/assets/characters/${sheet}.png`})));
CHARACTERS.push({id:'teacher-yu-jiyoung',name:'유지영 선생님',fullName:'Music Teacher',sheet:'teacher-yu-jiyoung',slot:0,layout:'single',asset:'./src/assets/characters/teacher-yu-jiyoung.png'});
export const characterById=id=>CHARACTERS.find(c=>c.id===id);
export const characterFor=player=>characterById(player.characterId)||CHARACTERS[(player.id||0)%CHARACTERS.length];
export function drawCharacterIds(count,used=[],random=Math.random){
  const pool=CHARACTERS.map(c=>c.id).filter(id=>!used.includes(id));
  if(!Number.isInteger(count)||count<0||count>pool.length)throw Error('배정할 수 있는 캐릭터가 부족합니다.');
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,count);
}
