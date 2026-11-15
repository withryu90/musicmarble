import {STREAMING_APPS,STREAMING_RIGHTS_PRICE} from './streaming.js?v=28a7deece9d0';
export const PRISON_MESSAGE='당신은 불법 스트리밍을 통해 음악을 감상한 죄로, 감옥에 갇혔습니다. 다음 세 번의 자기 차례에 탈출 주사위를 굴릴 수 있습니다. 6이 나오면 즉시 탈출하여 6칸 이동합니다. 세 번 모두 6이 나오지 않으면 그 세 차례는 감옥에 머물고, 다음 자기 차례부터 정상 이동합니다.';
export const ERAS = [
  {id:'baroque', name:'바로크', years:'약 1600–1750', color:'#9b7eaf', detail:'선율을 겹겹이 쌓고, 화려한 장식으로 감정을 표현한 시대'},
  {id:'classical', name:'고전주의', years:'약 1750–1820', color:'#729b91', detail:'균형과 명료한 형식, 교향곡과 소나타가 꽃핀 시대'},
  {id:'romantic', name:'낭만주의', years:'19세기 중심', color:'#c78971', detail:'개인의 감정과 상상력, 민족적 색채가 확장된 시대'},
  {id:'modern', name:'근현대', years:'19세기 말 이후', color:'#7595b7', detail:'새로운 음색과 리듬으로 기존의 규칙을 넓힌 시대'},
];
const w=(id,composer,title,year,era,price,fee,note)=>({id,composer,title,year,era,price,fee,note,type:'work'});
export const LEGACY_BOARD = [
  {id:'start',type:'start',title:'시대의 문',subtitle:'한 바퀴 +200 MC'},
  w('bach-air','바흐','G선상의 아리아','약 1731','baroque',160,45,'관현악 모음곡 제3번의 아리아. 유려한 선율 아래 꾸준한 저음이 흐릅니다.'),
  w('bach-brandenburg','바흐','브란덴부르크 협주곡','1721','baroque',180,53,'여섯 협주곡은 서로 다른 악기 편성으로 독주와 합주의 대화를 들려줍니다.'),
  {id:'event-1',type:'event',title:'음악사 사건',subtitle:'역사의 한 장면'},
  w('vivaldi-spring','비발디','사계: 봄','1725 출판','baroque',200,60,'새소리와 폭풍을 떠올리게 하는 바이올린 협주곡. 음악이 장면을 묘사합니다.'),
  w('vivaldi-winter','비발디','사계: 겨울','1725 출판','baroque',200,60,'떨리는 듯한 리듬과 대비되는 느린 악장에서 겨울의 풍경을 상상해 보세요.'),
  // Keep this tile ID stable for saved games; its repertoire is now Rinaldo.
  w('handel-water','헨델','울게 하소서','1711','baroque',210,60,'오페라 「리날도」 중 알미레나가 부르는 아리아. 애절한 선율로 슬픔과 자유를 향한 바람을 표현합니다.'),
  {id:'back-three',type:'back-three',title:'뒤로가기',subtitle:'추가 주사위만큼 뒤로'},
  w('mozart-serenade','모차르트','작은 밤의 음악','1787','classical',220,68,'아이네 클라이네 나흐트무지크. 명료한 선율과 균형 잡힌 구성이 돋보입니다.'),
  w('mozart-flute','모차르트','마술피리','1791','classical',240,75,'대사와 노래가 함께하는 징슈필. 다양한 인물의 성격을 음악으로 표현합니다.'),
  {id:'streaming-prison',type:'prison',title:'불법 스트리밍 감옥',subtitle:'6으로 탈출 · 기회 3번'},
  w('beethoven-5','베토벤','교향곡 제5번','1808 초연','classical',280,83,'짧은 네 음의 동기가 작품 전체를 이끕니다. 베토벤은 고전과 낭만을 잇는 작곡가입니다.'),
  w('beethoven-9','베토벤','교향곡 제9번','1824 초연','classical',300,90,'마지막 악장에 독창과 합창을 더해 교향곡의 표현 범위를 넓혔습니다.'),
  w('haydn-surprise','하이든','놀람 교향곡','1791','classical',260,75,'교향곡 제94번. 조용한 선율 속 갑작스러운 강한 화음으로 재치 있는 대비를 들려줍니다.'),
  {id:'concert',type:'concert',title:'음악회 개최',subtitle:'좌석별 티켓비'},
  w('schubert-king','슈베르트','마왕','1815','romantic',220,68,'한 명의 가수가 여러 인물을 표현하고, 피아노는 말발굽 같은 리듬으로 긴장을 만듭니다.'),
  w('schubert-trout','슈베르트','송어 5중주','1819','romantic',240,75,'가곡 「송어」의 선율을 변주합니다. 익숙한 멜로디가 어떻게 바뀌는지 살펴보세요.'),
  {id:'event-3',type:'event',title:'음악사 사건',subtitle:'새로운 청중'},
  w('chopin-nocturne','쇼팽','녹턴 Op.9 No.2','1832 출판','romantic',260,75,'노래하는 듯한 오른손 선율과 반주가 어우러지는 피아노 소품입니다.'),
  w('chopin-polonaises','쇼팽','영웅 폴로네즈','1842','romantic',280,83,'폴란드 춤 리듬에 강렬한 피아노 표현을 결합한 작품입니다.'),
  w('brahms-hungarian-5','브람스','헝가리 무곡 제5번','1869 출판','romantic',280,83,'춤의 활력과 빠르기·셈여림의 변화를 느낄 수 있는 음악입니다.'),
  {id:'go-to-prison',type:'go-to-prison',title:'감옥으로 가기',subtitle:'불법 스트리밍 감옥행'},
  w('debussy-moon','드뷔시','달빛','1905 출판','modern',280,83,'베르가마스크 모음곡의 한 곡. 화성과 음색이 만드는 분위기에 귀 기울여 보세요.'),
  w('ravel-bolero','라벨','볼레로','1928','modern',340,105,'반복되는 리듬과 선율 위에 악기의 음색이 더해지며 점점 강해지는 관현악곡입니다.'),
  {id:'copyright-transfer',type:'transfer',title:'저작권 양도',subtitle:'최고가 작품 양도'},
  w('stravinsky-firebird','스트라빈스키','불새','1910 초연','modern',320,98,'러시아 설화를 바탕으로 한 발레 음악. 풍부한 관현악 음색이 특징입니다.'),
  w('stravinsky-spring','스트라빈스키','봄의 제전','1913 초연','modern',340,105,'불규칙한 강세와 강렬한 리듬으로 새로운 음악의 가능성을 보여 주었습니다.'),
  w('debussy-sea','드뷔시','바다','1905 초연','modern',300,90,'관현악의 다채로운 색채로 바다의 움직임과 빛을 표현합니다.'),
];
export const BOARD=LEGACY_BOARD.flatMap((cell,index)=>{
 if((index+1)%7!==0)return [cell];
 const app=STREAMING_APPS[Math.floor(index/7)];
 if(app.id==='spotify')return [cell,{id:'work-swap',type:'work-swap',era:app.era,title:'작품 트레이드',subtitle:'작품 맞바꾸기'}];
 return [cell,{id:app.id,type:'streaming',era:app.era,title:'스트리밍 앱 인수',subtitle:app.name,price:STREAMING_RIGHTS_PRICE}];
});
export const WORKS = BOARD.filter(c=>c.type==='work');
export const EVENTS = [
  {"id":"music-event-01","category":"수익·기회 카드","period":"수익·기회 카드","title":"영화 OST 선정!","text":"당신이 소유한 작품이 인기 영화의 OST로 선정되었습니다!","effect":"+200 MC","amount":200,"prompt":"음악이 영화 장면의 분위기와 감정을 어떻게 바꿀까요?"},
  {"id":"music-event-02","category":"수익·기회 카드","period":"수익·기회 카드","title":"광고 음악 계약!","text":"당신이 소유한 작품이 유명 기업의 광고 음악으로 사용되었습니다!","effect":"+200 MC","amount":200,"prompt":"광고에 쓰일 음악을 고를 때 어떤 점을 생각할까요?"},
  {"id":"music-event-03","category":"수익·기회 카드","period":"수익·기회 카드","title":"스트리밍 역주행!","text":"당신이 소유한 작품이 음원 차트에서 역주행하며 큰 인기를 얻었습니다!","effect":"+150 MC","amount":150,"prompt":"오래된 작품이 다시 인기를 얻는 계기는 무엇일까요?"},
  {"id":"music-event-04","category":"수익·기회 카드","period":"수익·기회 카드","title":"세계적인 공연 개최!","text":"당신이 소유한 작품이 세계적인 오케스트라의 정기 연주회에서 공연되었습니다!","effect":"+150 MC","amount":150,"prompt":"같은 작품도 연주자와 공연장에 따라 어떻게 다르게 들릴까요?"},
  {"id":"music-event-05","category":"수익·기회 카드","period":"수익·기회 카드","title":"음악상 수상!","text":"당신이 제작한 음반이 올해의 클래식 음반상을 수상했습니다!","effect":"+200 MC","amount":200,"prompt":"음반을 평가할 때 판매량 외에 어떤 가치를 살펴볼까요?"},
  {"id":"music-event-06","category":"수익·기회 카드","period":"수익·기회 카드","title":"게임 음악으로 선정!","text":"당신이 소유한 작품이 인기 게임의 배경 음악으로 선정되었습니다!","effect":"+150 MC","amount":150,"prompt":"게임의 장면과 음악은 서로 어떤 영향을 줄까요?"},
  {"id":"music-event-07","category":"수익·기회 카드","period":"수익·기회 카드","title":"음반 판매 대박!","text":"당신이 제작한 클래식 음반이 베스트셀러에 올랐습니다!","effect":"+100 MC","amount":100,"prompt":"음반 한 장이 만들어지기까지 어떤 사람들이 함께 일할까요?"},
  {"id":"music-event-08","category":"수익·기회 카드","period":"수익·기회 카드","title":"유명 연주자의 선택!","text":"세계적인 피아니스트가 당신의 작품을 연주하여 큰 화제가 되었습니다!","effect":"+100 MC","amount":100,"prompt":"유명 연주자의 선택은 작품을 알리는 데 어떤 역할을 할까요?"},
  {"id":"music-event-09","category":"손실·위험 카드","period":"손실·위험 카드","title":"표절 판정!","text":"당신이 소유한 작품에 표절 문제가 확인되어 게임 속 계약에 따른 손실이 발생했습니다!","effect":"-200 MC","amount":-200,"prompt":"다른 작품을 참고하는 것과 그대로 베끼는 것은 어떻게 다를까요?"},
  {"id":"music-event-10","category":"손실·위험 카드","period":"손실·위험 카드","title":"저작권 침해!","text":"다른 사람의 보호받는 음원을 허락 없이 사용한 사실이 적발되었습니다!","effect":"-150 MC","amount":-150,"prompt":"음원을 사용하기 전에 어떤 이용 조건을 확인해야 할까요?"},
  {"id":"music-event-11","category":"손실·위험 카드","period":"손실·위험 카드","title":"음반 판매 부진!","text":"당신이 제작한 음반의 판매량이 예상보다 저조합니다!","effect":"-100 MC","amount":-100,"prompt":"판매량이 적다는 이유만으로 음악의 가치도 낮다고 할 수 있을까요?"},
  {"id":"music-event-12","category":"손실·위험 카드","period":"손실·위험 카드","title":"공연 취소!","text":"당신의 작품이 연주될 예정이던 공연이 갑자기 취소되었습니다!","effect":"-100 MC","amount":-100,"prompt":"공연이 취소되면 연주자와 제작자는 어떤 어려움을 겪을까요?"},
  {"id":"music-event-13","category":"손실·위험 카드","period":"손실·위험 카드","title":"투자 실패!","text":"신규 공연 제작에 많은 돈을 투자했지만 관객이 모이지 않았습니다!","effect":"-150 MC","amount":-150,"prompt":"공연을 준비할 때 예상 수익과 비용을 어떻게 비교할까요?"},
  {"id":"music-event-14","category":"손실·위험 카드","period":"손실·위험 카드","title":"계약 위반!","text":"음악 사용 계약의 조건을 지키지 않아 위약금이 발생했습니다!","effect":"-100 MC","amount":-100,"prompt":"음악 사용 계약에서 기간과 이용 범위를 확인하는 이유는 무엇일까요?"},
  {"id":"music-event-15","category":"손실·위험 카드","period":"손실·위험 카드","title":"불법 복제 피해!","text":"당신이 제작한 음반의 불법 복제가 확산되어 판매 수익이 감소했습니다!","effect":"-100 MC","amount":-100,"prompt":"음악을 정당한 경로로 이용하는 것은 창작 활동과 어떻게 연결될까요?"},
  {"id":"music-event-16","category":"손실·위험 카드","period":"손실·위험 카드","title":"후원 중단!","text":"당신의 음악 활동을 지원하던 후원자가 후원을 중단했습니다!","effect":"-100 MC","amount":-100,"prompt":"음악가에게는 후원 외에 어떤 수입원이 있을까요?"},
  {"id":"music-event-17","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"악보 인쇄술의 발전!","text":"악보를 대량으로 인쇄할 수 있게 되었습니다. 소유한 작품이 널리 보급됩니다!","effect":"+100 MC","amount":100,"prompt":"악보 인쇄술은 음악을 접하고 연주하는 사람들을 어떻게 늘렸을까요?"},
  {"id":"music-event-18","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"왕실의 후원!","text":"왕이 당신의 음악을 마음에 들어 합니다. 왕실 후원금을 받았습니다!","effect":"+150 MC","amount":150,"prompt":"후원자의 취향은 음악가의 창작에 어떤 영향을 줄까요?"},
  {"id":"music-event-19","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"시민 음악회의 인기!","text":"귀족뿐 아니라 일반 시민들도 음악회를 즐기기 시작했습니다!","effect":"+100 MC","amount":100,"prompt":"음악회의 청중이 넓어지면 공연 문화는 어떻게 달라질까요?"},
  {"id":"music-event-20","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"라디오 방송의 등장!","text":"당신의 작품이 라디오를 통해 널리 알려졌습니다!","effect":"+100 MC","amount":100,"prompt":"라디오는 공연장에 갈 수 없는 사람들에게 어떤 기회를 주었을까요?"},
  {"id":"music-event-21","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"해외 진출 성공!","text":"당신의 작품이 해외 공연장에서 큰 인기를 얻었습니다!","effect":"+150 MC","amount":150,"prompt":"다른 문화권의 청중에게 음악을 소개할 때 무엇을 고려할까요?"},
  {"id":"music-event-22","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"음악 축제 개최!","text":"당신이 소유한 작품들이 음악 축제의 주요 프로그램으로 선정되었습니다!","effect":"+150 MC","amount":150,"prompt":"여러 작품을 하나의 축제 프로그램으로 묶는 방법에는 무엇이 있을까요?"},
  {"id":"music-event-23","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"저작권 보호기간 만료!","text":"게임 속 원곡의 독점 이용 수익이 감소합니다. 이번 차례 수익에서 차감합니다!","effect":"-100 MC","amount":-100,"prompt":"원곡을 이용하는 것과 특정 연주·녹음을 이용하는 것은 어떻게 다를까요?"},
  {"id":"music-event-24","category":"음악사·산업 변화 카드","period":"음악사·산업 변화 카드","title":"음악 출판 계약!","text":"음악 출판사와 유리한 계약을 체결하여 악보 판매 수익을 얻었습니다!","effect":"+100 MC","amount":100,"prompt":"음악 출판사는 작품이 연주자에게 전달되는 과정에서 어떤 역할을 할까요?"},
];
export const QUIZZES = [
  {
    "id": "q31",
    "kind": "copyright",
    "question": "음원 파일을 구입하면 그 곡의 저작권도 내 것이 될까요?",
    "options": [
      "곡의 저작재산권까지 함께 이전받는다",
      "감상 이용 범위와 저작권 소유를 구별한다",
      "음원을 공개할 권리까지 함께 이전받는다"
    ],
    "answer": 1,
    "explanation": "음원 구매는 보통 감상을 위한 이용입니다. 곡의 저작권을 넘겨받는 것과는 다르므로 공개 이용은 별도로 확인해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q32",
    "kind": "copyright",
    "question": "내 블로그에서 누구나 원하는 때 음악을 듣게 하는 것과 관련 깊은 권리는?",
    "options": [
      "공중송신권",
      "복제권",
      "배포권"
    ],
    "answer": 0,
    "explanation": "온라인에서 사람들이 원하는 때 음악에 접근하게 하는 전송은 공중송신에 포함됩니다. 개인 감상과 공개 제공을 구별해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q33",
    "kind": "copyright",
    "question": "보호받는 음악을 영상에 넣고 작곡가 이름을 적으면 이용허락이 자동으로 생길까요?",
    "options": [
      "작곡가 표시를 이용허락의 근거로 삼는다",
      "영상의 조회 수를 이용허락의 근거로 삼는다",
      "출처 표시와 별도로 이용 근거를 확인한다"
    ],
    "answer": 2,
    "explanation": "출처를 적는 것과 이용허락은 별개입니다. 허락이나 법에서 정한 예외 등 이용할 근거가 있는지 확인해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q34",
    "kind": "copyright",
    "question": "광고 영상에 보호받는 음악을 15초 사용하려면 어떻게 판단할까요?",
    "options": [
      "사용 길이와 함께 이용허락·예외 조건을 살핀다",
      "사용 시간이 짧으면 허락이 면제된다고 본다",
      "음악의 비중이 작으면 허락이 면제된다고 본다"
    ],
    "answer": 0,
    "explanation": "짧게 사용해도 보호되는 음악의 이용일 수 있습니다. 몇 초라는 기준만으로 판단하지 말고 허락과 이용 조건을 확인해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q35",
    "kind": "copyright",
    "question": "보호받는 곡을 직접 연주해 온라인에 공개할 때 알맞은 생각은?",
    "options": [
      "직접 연주했으므로 원곡 이용허락을 대신한다",
      "자신의 녹음과 별도로 원곡 이용 근거를 확인한다",
      "악보 구입 영수증을 공개 이용허락으로 본다"
    ],
    "answer": 1,
    "explanation": "직접 만든 녹음과 원래 곡의 권리는 구별됩니다. 자기 연주라도 원곡의 이용허락이나 적용되는 예외를 살펴야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q36",
    "kind": "copyright",
    "question": "음악 파일을 불특정 다수가 내려받는 공개 공유 폴더에 올리는 것은?",
    "options": [
      "개인 컴퓨터의 폴더이므로 사적 이용으로 본다",
      "파일 소유자가 올렸으므로 재배포를 허용한다",
      "공개 제공 방식에 맞는 이용 근거를 확인한다"
    ],
    "answer": 2,
    "explanation": "누구나 접근하는 공유 폴더는 개인·가정의 한정된 범위와 다릅니다. 단순히 개인 컴퓨터에서 올렸다는 이유로 사적 이용이 되지는 않습니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q37",
    "kind": "copyright",
    "question": "보호받는 곡을 공연하며 입장료를 받는다면, 수익을 기부해도 살펴야 할 것은?",
    "options": [
      "기부 목적을 근거로 공연허락을 대신한다",
      "입장료와 공연허락·예외 조건을 함께 살핀다",
      "행사 종료 후 수익 정산을 공연허락으로 본다"
    ],
    "answer": 1,
    "explanation": "기부 목적만으로 공연의 권리 문제가 없어지지는 않습니다. 입장료 등 대가가 있는지와 이용허락 등 적용 조건을 확인해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q38",
    "kind": "copyright",
    "question": "저작자가 자신의 음악을 사람들 앞에서 연주하도록 할 권리는 무엇일까요?",
    "options": [
      "공연권",
      "배포권",
      "공중송신권"
    ],
    "answer": 0,
    "explanation": "음악을 공연할 권리는 저작재산권의 하나입니다. 실제 공연에서는 이용허락이나 법에서 허용하는 예외 등 이용 근거를 살펴야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q39",
    "kind": "copyright",
    "question": "음악의 스타일을 참고하는 것과 관련해 알맞은 설명은?",
    "options": [
      "장르가 같다는 사실로 표절 여부를 판단한다",
      "악기 구성이 같다는 사실로 침해 여부를 판단한다",
      "스타일과 구체적인 창작 표현을 구별한다"
    ],
    "answer": 2,
    "explanation": "장르나 스타일이 같다는 사실만으로 침해라고 단정할 수는 없습니다. 구체적인 창작 표현을 이용했는지 등을 구별해 살펴야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q40",
    "kind": "copyright",
    "question": "다른 사람이 만든 음반의 음악을 영상 배경음악으로 쓰려면 무엇을 구별해야 할까요?",
    "options": [
      "작사·작곡의 권리와 연주·녹음의 권리",
      "음반 구매 계약과 음악 감상 구독 기간",
      "영상 제작 비용과 음반의 판매 가격"
    ],
    "answer": 0,
    "explanation": "원곡의 권리와 실연자·음반제작자의 권리는 서로 다를 수 있습니다. 영상에 쓰는 방식에 맞게 관련 권리와 허락 범위를 확인해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q41",
    "kind": "copyright",
    "question": "직접 만든 창작곡의 저작권은 원칙적으로 언제 생길까요?",
    "options": [
      "저작권 등록을 마친 때",
      "곡을 창작한 때",
      "음원으로 발매한 때"
    ],
    "answer": 1,
    "explanation": "저작권은 창작과 함께 발생합니다. 등록이나 발매가 권리 발생의 필수 절차는 아닙니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q42",
    "kind": "copyright",
    "question": "아직 발표하지 않은 창작곡의 공개 여부와 관련된 권리는?",
    "options": [
      "성명표시권",
      "배포권",
      "공표권"
    ],
    "answer": 2,
    "explanation": "공표권은 저작물을 대중에게 처음 공개할지 결정하는 것과 관련된 저작인격권입니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q43",
    "kind": "copyright",
    "question": "작곡가가 실명 대신 예명으로 이름을 표시하려 할 때 관련된 권리는?",
    "options": [
      "성명표시권",
      "공표권",
      "공연권"
    ],
    "answer": 0,
    "explanation": "성명표시권은 저작자 이름의 표시와 관련됩니다. 실명이나 예명 등 표시 방식을 정할 수 있습니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q44",
    "kind": "copyright",
    "question": "창작곡의 내용이나 제목을 함부로 바꾸지 않도록 하는 권리는?",
    "options": [
      "성명표시권",
      "동일성유지권",
      "공중송신권"
    ],
    "answer": 1,
    "explanation": "동일성유지권은 저작물의 내용·형식·제호를 유지하는 것과 관련된 저작인격권입니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q45",
    "kind": "copyright",
    "question": "다음 중 저작인격권에 속하는 것은?",
    "options": [
      "복제권",
      "배포권",
      "공표권"
    ],
    "answer": 2,
    "explanation": "공표권은 저작인격권이고, 복제권과 배포권은 저작재산권입니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q46",
    "kind": "copyright",
    "question": "다음 중 저작재산권에 속하는 것은?",
    "options": [
      "복제권",
      "성명표시권",
      "동일성유지권"
    ],
    "answer": 0,
    "explanation": "복제권은 저작물을 녹음·복사 등으로 다시 제작하는 이용을 다루는 저작재산권입니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q47",
    "kind": "copyright",
    "question": "보호받는 악보를 스캔해 이미지 파일로 만드는 행위와 관련 깊은 권리는?",
    "options": [
      "공연권",
      "복제권",
      "대여권"
    ],
    "answer": 1,
    "explanation": "악보를 스캔해 파일로 다시 만드는 것은 복제에 해당할 수 있습니다. 이용허락이나 적용되는 예외를 확인해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=1&cnpClsNo=1&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q48",
    "kind": "copyright",
    "question": "보호받는 곡을 편곡해 새 버전으로 제작할 때 관련 깊은 권리는?",
    "options": [
      "배포권",
      "성명표시권",
      "2차적저작물작성권"
    ],
    "answer": 2,
    "explanation": "원곡을 창작적으로 편곡하는 경우 원곡의 2차적저작물작성권 등을 살펴야 합니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q49",
    "kind": "copyright",
    "question": "작사를 한 사람과 작곡을 한 사람이 다르다면 어떻게 이해할까요?",
    "options": [
      "가사와 곡에 각 창작자의 권리가 있을 수 있다",
      "음원을 먼저 발매한 사람이 두 권리를 가진다",
      "대표로 이름을 올린 사람이 두 권리를 가진다"
    ],
    "answer": 0,
    "explanation": "가사와 곡은 각 창작자가 권리를 가질 수 있습니다. 이용할 대상에 맞춰 권리 관계를 확인합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=1&cnpClsNo=2&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q50",
    "kind": "copyright",
    "question": "가수가 노래를 부른 실연에 관한 권리는 무엇으로 구별할까요?",
    "options": [
      "작사자의 저작권",
      "저작인접권",
      "작곡자의 저작권"
    ],
    "answer": 1,
    "explanation": "실연자의 권리는 작사·작곡의 저작권과 구별되는 저작인접권으로 보호됩니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=1&cnpClsNo=2&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q51",
    "kind": "copyright",
    "question": "음반을 기획하고 녹음 제작을 책임진 음반제작자의 권리는?",
    "options": [
      "작곡가의 성명표시권",
      "작사가의 공표권",
      "저작인접권"
    ],
    "answer": 2,
    "explanation": "음반제작자의 권리는 원곡 창작자의 저작권과 구별되는 저작인접권입니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=1&cnpClsNo=2&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q52",
    "kind": "copyright",
    "question": "작품 이용허락을 구하는 연락에 포함할 내용으로 가장 적절한 것은?",
    "options": [
      "사용 목적·방식·기간과 공개 범위",
      "사용자의 감상 취향과 좋아하는 장르",
      "행사 포스터의 색상과 관객의 연령"
    ],
    "answer": 0,
    "explanation": "이용허락은 허락받은 방법과 조건에 맞춰 이용해야 하므로 구체적인 사용 계획을 설명하는 것이 좋습니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=1&cnpClsNo=1&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q53",
    "kind": "copyright",
    "question": "비영리 행사 영상에 쓰도록 허락받은 음악을 상품 광고에도 쓰려면?",
    "options": [
      "기존 허락의 유효기간을 새 광고부터 계산한다",
      "광고 이용이 허락 범위에 포함되는지 확인한다",
      "상품 이름을 영상 제목에 표시해 허락을 이어간다"
    ],
    "answer": 1,
    "explanation": "기존 허락과 다른 목적으로 이용하려면 그 이용이 허락된 범위인지 확인해야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=1&cnpClsNo=1&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q54",
    "kind": "copyright",
    "question": "한 달간 사용하기로 허락받은 음악을 그 이후에도 이용하려면?",
    "options": [
      "원래의 허락 날짜를 표시하며 계속 이용한다",
      "게시물 설명에 연장 사실을 적고 계속 이용한다",
      "허락 기간을 연장하거나 새 이용 근거를 마련한다"
    ],
    "answer": 2,
    "explanation": "허락된 기간을 넘기는 이용은 기존 조건에 포함되는지 확인하고 필요한 허락을 다시 받아야 합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=1&cnpClsNo=1&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q55",
    "kind": "copyright",
    "question": "학교 수업에 쓴 보호받는 음악을 누구나 보는 채널에도 올리려면?",
    "options": [
      "수업 이용과 공개 업로드의 조건을 따로 살핀다",
      "수업 자료 표시를 달아 같은 조건으로 공개한다",
      "수강생의 동의를 받아 음악 이용허락을 대신한다"
    ],
    "answer": 0,
    "explanation": "수업 목적의 이용과 불특정 다수에게 공개하는 이용은 조건이 다를 수 있으므로 공개 이용 근거를 확인합니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"
  },
  {
    "id": "q56",
    "kind": "copyright",
    "question": "친구가 만든 미발표 곡을 소개하고 싶을 때 먼저 할 일은?",
    "options": [
      "친구의 이름을 적어 먼저 게시한다",
      "친구에게 공개 의사와 이용 범위를 확인한다",
      "친구에게 게시 주소를 보낸 뒤 공개를 알린다"
    ],
    "answer": 1,
    "explanation": "창작자의 공개 의사와 이용허락을 존중해야 합니다. 이름을 적는 것으로 공개 동의를 대신할 수는 없습니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q57",
    "kind": "copyright",
    "question": "저작재산권 양도와 이용허락의 차이로 알맞은 것은?",
    "options": [
      "양도는 감상 허용, 이용허락은 창작자 이름 변경이다",
      "양도는 이용 기간 연장, 이용허락은 권리 소멸이다",
      "양도는 권리 이전, 이용허락은 정한 범위의 사용 허용이다"
    ],
    "answer": 2,
    "explanation": "저작재산권을 넘기는 것과 권리자의 허락을 받아 일정 범위에서 이용하는 것은 구별됩니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=1&cnpClsNo=2&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q58",
    "kind": "copyright",
    "question": "음악 이용 계약에서 원곡의 권리와 녹음의 권리를 따로 적는 까닭은?",
    "options": [
      "관련 권리자와 허락 범위가 다를 수 있기 때문이다",
      "음악의 재생 속도가 계약마다 달라지기 때문이다",
      "음악 파일의 확장자가 권리자를 정하기 때문이다"
    ],
    "answer": 0,
    "explanation": "작사·작곡의 저작권과 실연·음반의 저작인접권은 구별되며 관련 권리자가 다를 수 있습니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=1&cnpClsNo=2&csmSeq=705&popMenu=ov"
  },
  {
    "id": "q59",
    "kind": "copyright",
    "question": "공연 영상의 이용허락을 받을 때 편집 계획도 설명하면 좋은 이유는?",
    "options": [
      "영상의 해상도로 저작권자를 결정하기 위해",
      "허락 범위와 작품 변경에 관한 조건을 확인하기 위해",
      "편집 프로그램의 종류로 이용료를 면제받기 위해"
    ],
    "answer": 1,
    "explanation": "사용 방식과 편집 내용을 미리 설명하면 이용허락 범위와 작품 변경에 관한 조건을 구체적으로 확인할 수 있습니다.",
    "sourceUrl": "https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1"
  },
  {
    "id": "q60",
    "kind": "copyright",
    "question": "음악 이용허락을 받았다는 사실을 기록해 두는 주된 이유는?",
    "options": [
      "음악의 저작자 이름을 이용자 이름으로 바꾸기 위해",
      "다른 이용자에게 같은 허락을 자동으로 주기 위해",
      "허락받은 이용 범위와 조건을 나중에 확인하기 위해"
    ],
    "answer": 2,
    "explanation": "이용허락의 대상과 조건을 기록하면 실제 이용이 합의한 범위에 맞는지 확인하는 데 도움이 됩니다.",
    "sourceUrl": "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=1&cnpClsNo=1&csmSeq=705&popMenu=ov"
  }
];
export const SOURCES = [
  {label:'찾기쉬운 생활법령정보 · 음악저작권 침해의 유형',url:"https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=705&ccfNo=3&cciNo=1&cnpClsNo=1"},
  {label:'국가법령정보센터 · 저작권법',url:'https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&lsId=000798'},
  {label:'문화체육관광부 · 저작자의 권리',url:'https://www.mcst.go.kr/site/s_policy/copyright/knowledge/know06.jsp?pCommPage=1'},
  {label:'Creative Commons · CC BY-NC 4.0',url:'https://creativecommons.org/licenses/by-nc/4.0/deed.ko'},
  {label:'문화체육관광부 · 저작권법상 권리자',url:'https://www.mcst.go.kr/site/s_policy/copyright/netizen/netizen03.jsp'},
  {label:'한국저작권위원회 · 공유마당 만료저작물 안내',url:'https://gongu.copyright.or.kr/gongu/main/contents.do?menuNo=200091'},
];

export const CONCERT_SEATS=Object.freeze([{id:'s',name:'S석',price:50},{id:'r',name:'R석',price:100},{id:'vip',name:'VIP석',price:150}].map(Object.freeze));
