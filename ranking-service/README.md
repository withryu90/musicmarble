# 뮤직마블 전체 랭킹 · Cloudflare Workers + D1

게임은 기존 GitHub Pages에서 실행하고, 게임 종료 점수만 이 공용 서버에 저장합니다.

1. Cloudflare 계정 연결: `npx wrangler login`
2. D1 만들기: `npx wrangler d1 create musicmarble-ranking`
3. 반환된 database_id를 wrangler.jsonc의 DB 바인딩에 입력
4. 운영 스키마 적용: `npx wrangler d1 migrations apply DB --remote`
5. 배포: `npx wrangler deploy`
6. 반환된 HTTPS 주소를 게임 src/ranking.js의 RANKING_ORIGIN에 입력한 뒤 GitHub Pages 갱신

개발: `npm install`, `npm run dev`. 검사: `npm test`. 로컬 미리보기와 운영 데이터는 분리됩니다. 계정 로그인 정보, 기록 키, 실제 점수 데이터는 소스 저장소에 저장하지 않습니다.

API: GET /api/ranking/top, POST /api/ranking/register, POST /api/ranking/submit. 게임별 전용 기록 키로만 점수를 등록하며 같은 게임의 점수는 한 번만 기록합니다. 봇은 클라이언트가 등록 명단에서 제외합니다. 현재 랭킹 상위 10위에 표시되는 닉네임만 새 게임에서 사용할 수 없습니다. POST /api/ranking/nickname으로 새 방 만들기·참가·혼자 플레이 전에 사용 가능 여부를 확인합니다. 랭킹에 없는 이름은 다른 게임에서도 다시 사용할 수 있으며 과거 예약 기록은 중복 판단에 사용하지 않습니다. 이미 시작한 게임은 같은 이름이 랭킹에 올라와도 정상 종료·기록됩니다. 점수는 합산하지 않고 같은 이름의 최고 점수 한 건만 표시합니다.

로그인 없는 PeerJS 게임의 방장이 보내는 종료 점수를 기록하는 구조입니다. 서버는 기록 권한과 명단, 점수 범위를 확인하며 전체 플레이 기록을 재연산하는 부정행위 방지 서버는 아닙니다.

공식 안내: https://developers.cloudflare.com/d1/get-started/ , https://developers.cloudflare.com/workers/wrangler/configuration/
