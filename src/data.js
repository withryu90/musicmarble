export const ERAS = [
  {id:'baroque', name:'바로크', years:'약 1600–1750', color:'#9b7eaf', detail:'선율을 겹겹이 쌓고, 화려한 장식으로 감정을 표현한 시대'},
  {id:'classical', name:'고전주의', years:'약 1750–1820', color:'#729b91', detail:'균형과 명료한 형식, 교향곡과 소나타가 꽃핀 시대'},
  {id:'romantic', name:'낭만주의', years:'19세기 중심', color:'#c78971', detail:'개인의 감정과 상상력, 민족적 색채가 확장된 시대'},
  {id:'modern', name:'근현대', years:'19세기 말 이후', color:'#7595b7', detail:'새로운 음색과 리듬으로 기존의 규칙을 넓힌 시대'},
];
const w=(id,composer,title,year,era,price,fee,note)=>({id,composer,title,year,era,price,fee,note,type:'work'});
export const BOARD = [
  {id:'start',type:'start',title:'시대의 문',subtitle:'한 바퀴 +200 MC'},
  w('bach-air','바흐','G선상의 아리아','약 1731','baroque',160,30,'관현악 모음곡 제3번의 아리아. 유려한 선율 아래 꾸준한 저음이 흐릅니다.'),
  w('bach-brandenburg','바흐','브란덴부르크 협주곡','1721','baroque',180,35,'여섯 협주곡은 서로 다른 악기 편성으로 독주와 합주의 대화를 들려줍니다.'),
  {id:'event-1',type:'event',title:'음악사 사건',subtitle:'역사의 한 장면'},
  w('vivaldi-spring','비발디','사계: 봄','1725 출판','baroque',200,40,'새소리와 폭풍을 떠올리게 하는 바이올린 협주곡. 음악이 장면을 묘사합니다.'),
  w('vivaldi-winter','비발디','사계: 겨울','1725 출판','baroque',200,40,'떨리는 듯한 리듬과 대비되는 느린 악장에서 겨울의 풍경을 상상해 보세요.'),
  {id:'quiz-1',type:'quiz',title:'뮤직 퀴즈',subtitle:'생각하고 +80 MC'},
  w('mozart-serenade','모차르트','작은 밤의 음악','1787','classical',220,45,'아이네 클라이네 나흐트무지크. 명료한 선율과 균형 잡힌 구성이 돋보입니다.'),
  w('mozart-flute','모차르트','마술피리','1791','classical',240,50,'대사와 노래가 함께하는 징슈필. 다양한 인물의 성격을 음악으로 표현합니다.'),
  {id:'event-2',type:'event',title:'음악사 사건',subtitle:'변화의 순간'},
  w('beethoven-5','베토벤','교향곡 제5번','1808 초연','classical',280,55,'짧은 네 음의 동기가 작품 전체를 이끕니다. 베토벤은 고전과 낭만을 잇는 작곡가입니다.'),
  w('beethoven-9','베토벤','교향곡 제9번','1824 초연','classical',300,60,'마지막 악장에 독창과 합창을 더해 교향곡의 표현 범위를 넓혔습니다.'),
  {id:'concert',type:'concert',title:'모두의 음악회',subtitle:'함께 +100 MC'},
  w('schubert-king','슈베르트','마왕','1815','romantic',220,45,'한 명의 가수가 여러 인물을 표현하고, 피아노는 말발굽 같은 리듬으로 긴장을 만듭니다.'),
  w('schubert-trout','슈베르트','송어 5중주','1819','romantic',240,50,'가곡 「송어」의 선율을 변주합니다. 익숙한 멜로디가 어떻게 바뀌는지 살펴보세요.'),
  {id:'event-3',type:'event',title:'음악사 사건',subtitle:'새로운 청중'},
  w('chopin-nocturne','쇼팽','녹턴 Op.9 No.2','1832 출판','romantic',260,50,'노래하는 듯한 오른손 선율과 반주가 어우러지는 피아노 소품입니다.'),
  w('chopin-polonaises','쇼팽','영웅 폴로네즈','1842','romantic',280,55,'폴란드 춤 리듬에 강렬한 피아노 표현을 결합한 작품입니다.'),
  {id:'copyright',type:'copyright',title:'권리 탐구실',subtitle:'이용 전에 확인!'},
  w('debussy-moon','드뷔시','달빛','1905 출판','modern',280,55,'베르가마스크 모음곡의 한 곡. 화성과 음색이 만드는 분위기에 귀 기울여 보세요.'),
  w('debussy-sea','드뷔시','바다','1905 초연','modern',300,60,'관현악의 다채로운 색채로 바다의 움직임과 빛을 표현합니다.'),
  {id:'event-4',type:'event',title:'음악사 사건',subtitle:'낯선 소리의 등장'},
  w('stravinsky-firebird','스트라빈스키','불새','1910 초연','modern',320,65,'러시아 설화를 바탕으로 한 발레 음악. 풍부한 관현악 음색이 특징입니다.'),
  w('stravinsky-spring','스트라빈스키','봄의 제전','1913 초연','modern',340,70,'불규칙한 강세와 강렬한 리듬으로 새로운 음악의 가능성을 보여 주었습니다.'),
];
export const WORKS = BOARD.filter(c=>c.type==='work');
export const EVENTS = [
  {title:'공개 연주회의 성장',period:'18–19세기',text:'궁정 밖의 청중이 늘어나며 음악가의 활동 무대도 넓어졌습니다.',effect:'새로운 청중 후원금 +120 MC',amount:120,prompt:'청중이 많아지면 음악가의 수입과 창작은 어떻게 달라질까요?'},
  {title:'악보 출판의 확산',period:'음악과 인쇄 문화',text:'악보가 널리 유통되면서 작품은 더 많은 가정과 연주자에게 전해졌습니다.',effect:'악보 기획 지원금 +100 MC',amount:100,prompt:'작품이 널리 알려지는 것과 창작자의 보상은 어떤 관계일까요?'},
  {title:'살롱의 작은 음악회',period:'19세기',text:'작은 공간에서 연주되는 가곡과 피아노 음악이 사람들을 연결했습니다.',effect:'소규모 공연 수익 +80 MC',amount:80,prompt:'작은 공간에 어울리는 음악에는 어떤 특징이 있을까요?'},
  {title:'공연을 준비하는 사람들',period:'음악의 무대 뒤',text:'공연에는 연주자, 공간, 악기와 준비 시간이 필요합니다.',effect:'무대 준비 비용 −60 MC',amount:-60,prompt:'티켓값에는 음악 외에 어떤 노동의 가치가 담겨 있을까요?'},
  {title:'녹음 기술의 등장',period:'19세기 말 이후',text:'현장에 가지 않고도 연주를 다시 들을 수 있게 되며 음악의 유통 방식이 달라졌습니다.',effect:'새 매체 기획금 +100 MC',amount:100,prompt:'악보에 담긴 작품과 녹음된 연주는 같은 권리일까요?'},
  {title:'낯선 음악과 첫 만남',period:'20세기 초',text:'새로운 리듬과 소리는 익숙한 음악을 기대했던 청중에게 놀라움을 주었습니다.',effect:'실험 음악 연구금 +80 MC',amount:80,prompt:'초연 당시의 인기와 오늘날의 평가는 꼭 같을까요?'},
  {title:'지역 음악 축제',period:'가상의 수업 시나리오',text:'학급에서 여러 시대의 작품을 함께 소개하는 축제를 기획합니다.',effect:'축제 참여 지원금 +120 MC',amount:120,prompt:'서로 다른 시대의 작품을 어떤 주제로 묶을 수 있을까요?'},
  {title:'악기 점검의 날',period:'가상의 수업 시나리오',text:'좋은 공연을 위해 악기를 관리하고 연주 환경을 준비합니다.',effect:'악기 관리 비용 −40 MC',amount:-40,prompt:'음악 활동을 오래 지속하려면 무엇이 필요할까요?'},
];
export const QUIZZES = [
  {id:'q1',kind:'history',question:'바로크 시대에 주로 활동한 작곡가 둘은 누구일까요?',options:['바흐와 비발디','쇼팽과 슈베르트','드뷔시와 스트라빈스키'],answer:0,explanation:'바흐와 비발디는 바로크 시대를 대표합니다. 시대 구분은 흐름을 이해하는 도구이며 경계는 겹칠 수 있습니다.'},
  {id:'q2',kind:'history',question:'베토벤 교향곡 제9번의 마지막 악장에 더해진 것은?',options:['전자 악기','독창과 합창','영화 화면'],answer:1,explanation:'베토벤은 교향곡에 사람의 목소리를 더했습니다. 악기와 목소리의 결합이 표현을 넓힙니다.'},
  {id:'q3',kind:'history',question:'「마왕」에서 피아노 반주는 어떤 역할을 할까요?',options:['노래와 상관없는 배경','노래를 대신하는 장식','장면의 긴장과 움직임 표현'],answer:2,explanation:'빠르게 반복되는 반주는 말의 질주와 긴장을 떠올리게 합니다. 가곡에서 시, 노래, 피아노는 함께 이야기를 만듭니다.'},
  {id:'q4',kind:'history',question:'「봄의 제전」의 특징으로 알맞은 것은?',options:['불규칙한 강세와 강렬한 리듬','언제나 같은 박자의 조용한 반주','바로크 시대의 전형적 모음곡'],answer:0,explanation:'스트라빈스키는 강세와 리듬을 대담하게 다뤘습니다. 낯설게 들린 음악이 훗날 중요한 작품으로 평가되기도 합니다.'},
  {id:'q5',kind:'copyright',question:'게임에서 작품 이용권을 샀다면 실제로 생기는 권리는?',options:['음원을 인터넷에 올릴 권리','게임 안의 가상 이용료를 받을 권리','실제 작품의 저작권'],answer:1,explanation:'뮤직마블 이용권은 게임 안에서만 유효합니다. 실제 작품, 연주, 음원의 권리를 취득하지 않습니다.'},
  {id:'q6',kind:'copyright',question:'오래된 작품의 최근 녹음 파일을 영상에 쓰려면?',options:['작곡가가 오래전에 사망했으므로 무조건 가능','출처만 적으면 항상 가능','녹음·연주 등 관련 권리와 이용 조건도 확인'],answer:2,explanation:'작품의 저작권과 녹음·연주에 관한 권리는 구별됩니다. 작품의 보호기간이 끝났더라도 녹음은 별도로 확인해야 합니다.'},
  {id:'q7',kind:'copyright',question:'무료로 내려받은 음원은 모든 용도로 쓸 수 있을까요?',options:['이용허락 범위와 조건을 확인해야 한다','무료이면 어떤 이용도 가능하다','제목만 바꾸면 가능하다'],answer:0,explanation:'가격이 무료라는 사실과 이용허락의 범위는 다릅니다. 배포처의 조건, 출처 표시, 허용된 이용을 확인하는 습관이 중요합니다.'},
  {id:'q8',kind:'history',question:'작품의 게임 가격은 무엇을 뜻할까요?',options:['실제 작품의 절대적 예술 순위','게임의 균형을 위한 가상 수치','작곡가의 실제 수입'],answer:1,explanation:'가격과 이용료는 게임 균형을 위한 수치입니다. 예술적·역사적 가치를 하나의 가격이나 순위로 환산할 수는 없습니다.'},
  {id:'q9',kind:'history',question:'쇼팽의 「영웅 폴로네즈」와 관련 있는 것은?',options:['그레고리오 성가','전자음악','폴란드 춤 리듬'],answer:2,explanation:'폴로네즈는 폴란드의 춤에서 비롯된 형식입니다. 쇼팽은 피아노로 그 리듬과 성격을 표현했습니다.'},
  {id:'q10',kind:'copyright',question:'음원 출처를 표시하는 것만으로 이용허락을 대신할 수 있을까요?',options:['이용 조건과 허락 여부를 따로 확인해야 한다','출처를 쓰면 모든 사용이 허용된다','교실에서는 모든 음원의 재배포가 가능하다'],answer:0,explanation:'출처 표시와 이용허락은 서로 다른 문제입니다. 구체적인 이용 방식과 적용 조건을 확인해야 합니다.'},
];
export const SOURCES = [
  {label:'문화체육관광부 · 저작권법상 권리자',url:'https://www.mcst.go.kr/site/s_policy/copyright/netizen/netizen03.jsp'},
  {label:'한국저작권위원회 · 공유마당 만료저작물 안내',url:'https://gongu.copyright.or.kr/gongu/main/contents.do?menuNo=200091'},
];
