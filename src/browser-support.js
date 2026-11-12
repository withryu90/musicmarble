/* ES5 syntax intentionally: IE must show a readable message before the module loads. */
(function () {
  var supported = !document.documentMode && 'noModule' in document.createElement('script') &&
    typeof window.fetch === 'function' && typeof window.EventSource === 'function' &&
    typeof window.structuredClone === 'function' &&
    typeof window.HTMLDialogElement !== 'undefined' && typeof document.createElement('dialog').showModal === 'function' &&
    typeof Array.prototype.at === 'function';
  if (!supported) {
    var app = document.getElementById('app');
    app.innerHTML = '<main class="browser-support-notice" role="alert"><h1>뮤직마블에 오신 것을 환영해요!</h1>' +
      '<p>이 브라우저에서는 게임을 실행할 수 없어요.</p>' +
      '<p>최신 Microsoft Edge, Chrome 또는 Safari에서 같은 주소를 열어 주세요. Safari는 15.4 이상이 필요합니다.</p>' +
      '<p>Internet Explorer와 Edge의 IE 모드에서는 플레이를 지원하지 않습니다.</p>' +
      '<label for="game-address">게임 주소 · 복사해서 새 브라우저에서 열어 주세요</label><input id="game-address" readonly />' +
      '<p><a href="https://www.microsoft.com/edge">Microsoft Edge 안내</a></p></main>';
    document.getElementById('game-address').value = window.location.href;
    return;
  }
  var script = document.createElement('script');
  script.type = 'module';
  script.src = './src/app.js?v=concert-planning-1';
  script.onerror = function () {
    document.getElementById('app').innerHTML = '<main class="browser-support-notice" role="alert"><h1>게임을 불러오지 못했어요.</h1><p>연결을 확인한 뒤 새로고침해 주세요.</p></main>';
  };
  document.body.appendChild(script);
}());
