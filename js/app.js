
// app.js - enhanced: intro typing, start -> selection -> load chosen source -> main flashcard
(function(){
  // DOM
  const intro = document.getElementById('intro');
  const typeTextEl = document.getElementById('typeText');
  const startBtn = document.getElementById('startBtn');
  const selection = document.getElementById('selection');
  const sourceList = document.getElementById('sourceList');
  const selSpinner = document.getElementById('selSpinner');

  const mainApp = document.getElementById('mainApp');
  const CARD = document.getElementById('card');
  const WORD_EL = document.getElementById('word');
  const EX_EL = document.getElementById('example');

  // Overlay card
  const OVERLAY = document.getElementById('overlay');
  const INFO_CARD = document.getElementById('infoCard');
  const INFO_WORD = document.getElementById('infoWord');
  const INFO_MEANING = document.getElementById('infoMeaning');

  // Data vars
  let words = null;
  // overview / rechoose controls
  const overviewBtn = document.getElementById('overviewBtn');
  const overviewModal = document.getElementById('overviewModal');
  const overviewList = document.getElementById('overviewList');
  const overviewClose = document.getElementById('overviewClose');
  const rechooseBtn = document.getElementById('rechooseBtn');

  let consumedInRound = 0; // 记录当前轮已展示多少单词

  const fallback = [
    {"word":"abandon","example":"He abandoned hope.","meaning":"放弃"},
    {"word":"attain","example":"She attained success.","meaning":"获得，达到"},
    {"word":"discourage","example":"Don't let setbacks discourage you.","meaning":"使气馁；阻止"},
    {"word":"fierce","example":"The competition was fierce.","meaning":"激烈的，凶猛的"}
  ];

  // Shuffle state
  let order = [];
  let idx = 0;
  let current = null;

  // swipe control helpers
  let swipePointerId = null;
  let swipeTransitionHandler = null;
  let swipeAnimating = false;


  // Typing intro text
  const introSentence = "It is for us, the living, to be here dedicated to the great task remaining before us.";
  function typeIntro(totalMs = 3000){
    typeTextEl.textContent = '';
    typeTextEl.style.opacity = '1';
    const chars = Array.from(introSentence);
    const perChar = Math.max(8, Math.floor(totalMs / chars.length));
    let i = 0;
    const t = setInterval(()=>{
      typeTextEl.textContent += chars[i++];
      if(i >= chars.length){
        clearInterval(t);
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              startBtn.classList.remove('hidden');
            });
          });
        }, 300);
      }
    }, perChar);
  }

  // selection UI（词库列表由 light-control.js 渲染；模式选项在 Start 后显示）
  const modeSwitch = document.getElementById('modeSwitch');
  const btnWord = document.getElementById('btn-word');      // 👈 添加
  const btnPhrase = document.getElementById('btn-phrase');  // 👈 添加
  const btnSentence = document.getElementById('btn-sentence'); // 👈 添加

  function showSelection(){
    intro.classList.add('hidden');
    selection.classList.remove('hidden');
    selection.setAttribute('aria-hidden','false');
    if (modeSwitch) modeSwitch.classList.remove('hidden');
    if (typeof window.ensureSourceListRendered === 'function') {
      window.ensureSourceListRendered();
    }
  }

  function loadSources(){
    sourceList.innerHTML = '';
    selSpinner.classList.remove('hidden');
    // Try to fetch data/sources.json
    fetch('./data/sources.json')
      .then(r=>{ if(!r.ok) throw new Error('no sources'); return r.json(); })
      .then(list=>{
        selSpinner.classList.add('hidden');
        if(!Array.isArray(list) || list.length===0){
          sourceList.innerHTML = '<div class="source-item">没有可用的词库，请添加 data/sources.json</div>';
          return;
        }
        list.forEach(s=>{
          const el = document.createElement('div');
          el.className = 'source-item';
          el.tabIndex = 0;
          el.textContent = s.label || s.id || s.file;
          el.addEventListener('click', ()=> selectSource(s));
          el.addEventListener('keydown', (e)=>{ if(e.key==='Enter') selectSource(s); });
          sourceList.appendChild(el);
        });
      })
      .catch(err=>{
        // fallback: show the default sample source
        selSpinner.classList.add('hidden');
        console.warn('加载 sources.json 失败，使用内置示例。', err);
        const el = document.createElement('div');
        el.className = 'source-item';
        el.tabIndex = 0;
        el.textContent = '示例词库（word1）';
        el.addEventListener('click', ()=> selectSource({file:'word1.json', id:'word1', label:'示例词库（word1）'}));
        sourceList.appendChild(el);
      });
  }

  function selectSource(source){
    if (!source || !source.file) return;
    // UI feedback: show spinner while loading words
    selSpinner.classList.remove('hidden');
    loadWords(source.file).then(list=>{
      selSpinner.classList.add('hidden');
      words = Array.isArray(list) && list.length ? list : fallback;
      // reset shuffle
      order = []; idx = 0;
      // reset per-round counter & hide rechoose button
      consumedInRound = 0;
      /*if (rechooseBtn) rechooseBtn.classList.add('hidden');*/
      rechooseBtn.classList.remove('hidden');

      // hide selection and 模式按钮，show main app
      selection.classList.add('hidden');
      selection.setAttribute('aria-hidden','true');
      if (modeSwitch) modeSwitch.classList.add('hidden');
      mainApp.classList.remove('hidden');
      mainApp.setAttribute('aria-hidden','false');
      showNext();
    });
  }

  // 供 light-control.js 选择词库后调用
  window.startLearning = selectSource;

  // loadWords：filename 可为 "word1.json" 或 "words/word1.json" 等相对 data 的路径
  function loadWords(filename = 'words/word1.json'){
    return fetch(`./data/${filename}`)
      .then(r=>{ if(!r.ok) throw new Error('fetch fail'); return r.json(); })
      .catch(err=>{
        console.warn('加载词库失败，使用内置示例', err);
        return fallback;
      });
  }

  // shuffle and nextIndex
  function shuffle(n){
    const a = Array.from({length:n}, (_,i)=>i);
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }
  function nextIndex(){
    if(!words || words.length===0) return -1;
    if(order.length === 0 || idx >= order.length){
      order = shuffle(words.length);
      idx = 0;
    }
    return order[idx++];
  }

  // render
  function showWordByIndex(i){
    if(typeof i !== 'number' || i < 0 || i >= (words ? words.length : 0)) return;
    current = words[i];
    WORD_EL.textContent = current.word;
    EX_EL.textContent = current.example;
    CARD.style.transform = '';
    CARD.classList.remove('off-left','off-right');
  }
  function showNext(){
    const i = nextIndex();
    if(i < 0) return;
    showWordByIndex(i);

    // 统计本轮消耗
    consumedInRound++;
    // 若已展示完全部单词（一个轮次完成），显示右上角重新选择按钮
    if(words && consumedInRound >= words.length){
      // 等待一小会儿再显示（避免和动画冲突）
      /*setTimeout(()=>{
        if(rechooseBtn) rechooseBtn.classList.remove('hidden');
      }, 200);*/
      // 重置 consumedInRound 为 0，下一次 showNext 将开始新一轮计数
      consumedInRound = 0;
    }
  }


  // speak
  function speak(text){
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  WORD_EL.addEventListener('click', ()=> { if(current) speak(current.word); });
  WORD_EL.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' && current) speak(current.word); });

  // example -> open overlay
  EX_EL.addEventListener('click', openInfoCard);
  EX_EL.addEventListener('keydown', (e)=>{ if(e.key==='Enter') openInfoCard(); });

  function openInfoCard(){
    if(!current) return;
    INFO_WORD.textContent = current.word;
    INFO_MEANING.textContent = current.meaning;
    OVERLAY.classList.remove('hidden');
    OVERLAY.setAttribute('aria-hidden','false');
    INFO_CARD.style.transition = '';
    INFO_CARD.style.transform = 'translateX(0) translateY(0) rotate(0)';
    INFO_CARD.classList.remove('off-left','off-right');
  }
  function closeInfoCard(){
    OVERLAY.classList.add('hidden');
    OVERLAY.setAttribute('aria-hidden','true');

    // 重置卡片位置和状态
    INFO_CARD.style.transition = '';
    INFO_CARD.style.transform = 'translateX(0) translateY(0) rotate(0)';
    INFO_CARD.classList.remove('off-left','off-right');

    // 清理 swipe 状态
    swipeAnimating = false;
    swipePointerId = null;
  }

  // show overview modal: 填充 overviewList 并显示 modal
  function showOverview(){
    if(!words || words.length === 0){
      overviewList.innerHTML = '<div class="overview-item">当前词库为空</div>';
    } else {
      overviewList.innerHTML = '';
      words.forEach(w=>{
        const item = document.createElement('div');
        item.className = 'overview-item';
        // 左：单词 + 含义（简洁），右可以放序号
        item.innerHTML = `<div><span class="w">${escapeHtml(w.word)}</span><span class="m">${escapeHtml(w.meaning||'')}</span></div>`;
        overviewList.appendChild(item);
      });
    }
    overviewModal.classList.remove('hidden');
    overviewModal.setAttribute('aria-hidden','false');
  }

  // close overview
  function hideOverview(){
    overviewModal.classList.add('hidden');
    overviewModal.setAttribute('aria-hidden','true');
  }

  // small helper to avoid XSS when inserting text (good practice)
  function escapeHtml(s){
    if(!s) return '';
    return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // bind overview button and modal close
  if(overviewBtn) overviewBtn.addEventListener('click', showOverview);
  if(overviewClose) overviewClose.addEventListener('click', hideOverview);

  // swipe binding for info card
  (function bindSwipe(){
    let startX=0, startY=0, curX=0, curY=0, dragging=false;
    const threshold = 110;
    INFO_CARD.style.willChange = 'transform';

    function cleanAfterSwipe(){
      // clear pointer capture if any
      try{
        if(swipePointerId != null){
          INFO_CARD.releasePointerCapture(swipePointerId);
        }
      }catch(e){ /* ignore */ }
      swipePointerId = null;
      dragging = false;
      curX = 0; curY = 0;
      swipeAnimating = false;
      // ensure transform reset (safety)
      INFO_CARD.style.transition = '';
      INFO_CARD.classList.remove('off-left','off-right');
    }

    INFO_CARD.addEventListener('pointerdown', (ev)=>{
      // only start new drag if not currently animating out
      if(swipeAnimating) return;
      ev.preventDefault();
      try{ INFO_CARD.setPointerCapture(ev.pointerId); } catch(e){}
      swipePointerId = ev.pointerId;
      startX = ev.clientX;
      startY = ev.clientY;
      curX = 0;
      curY = 0;
      dragging = true;
      INFO_CARD.style.transition = 'none';
    });

    INFO_CARD.addEventListener('pointermove', (ev)=>{
      if(!dragging) return;
      curX = ev.clientX - startX;
      curY = ev.clientY - startY;
      INFO_CARD.style.transform = `translateX(${curX}px) translateY(${curY}px) rotate(${curX/20}deg)`;
    });

    INFO_CARD.addEventListener('pointerup', (ev)=>{
      if(!dragging) return;
      // release pointer immediately to avoid blocking other UI
      try{ if(swipePointerId != null) INFO_CARD.releasePointerCapture(swipePointerId); } catch(e){}
      swipePointerId = null;
      dragging = false;

      // decide whether to swipe away
      if(Math.abs(curX) > threshold){
        swipeAnimating = true;
        // add class to trigger CSS exit animation
        INFO_CARD.classList.add(curX>0 ? 'off-right' : 'off-left');

        // Use transitionend to know exactly when the CSS animation finished
        // remove any previously attached handler
        if(swipeTransitionHandler) INFO_CARD.removeEventListener('transitionend', swipeTransitionHandler);

        swipeTransitionHandler = function onEnd(e){
          // ensure we only handle transform/end
          if(e.propertyName && e.propertyName.indexOf('transform') === -1) return;
          INFO_CARD.removeEventListener('transitionend', swipeTransitionHandler);
          swipeTransitionHandler = null;

          // cleanup and move to next
          closeInfoCard(); // hide overlay and reset
          // small next-tick to avoid reflow collisions
          requestAnimationFrame(()=> showNext());
        };
        INFO_CARD.addEventListener('transitionend', swipeTransitionHandler);

        // As a safety fallback (some browsers may not fire transitionend reliably),
        // set a timeout slightly longer than CSS animation (0.5s)
        setTimeout(()=>{
          if(swipeTransitionHandler){
            INFO_CARD.removeEventListener('transitionend', swipeTransitionHandler);
            swipeTransitionHandler = null;
            closeInfoCard();
            requestAnimationFrame(()=> showNext());
          }
        }, 600);

      } else {
        // not enough movement -> spring back
        INFO_CARD.style.transition = 'transform .25s ease';
        INFO_CARD.style.transform = 'translateX(0) translateY(0) rotate(0)';
        // ensure dragging flag cleared already
      }
    });

    INFO_CARD.addEventListener('pointercancel', ()=>{
      // cancel safely
      try{ if(swipePointerId != null) INFO_CARD.releasePointerCapture(swipePointerId); } catch(e){}
      swipePointerId = null;
      dragging=false;
      INFO_CARD.style.transition = 'transform .25s ease';
      INFO_CARD.style.transform = 'translateX(0) translateY(0) rotate(0)';
    });

  })();

  // optional: double-click card to next
  CARD.addEventListener('dblclick', showNext);

  // Start button behavior
  startBtn.addEventListener('click', ()=> { startBtn.disabled = true; showSelection(); });
  // 点击“重新选择词库”返回选择页面

  if(rechooseBtn){
    rechooseBtn.addEventListener('click', ()=>{
      mainApp.classList.add('hidden');
      mainApp.setAttribute('aria-hidden', 'true');
      selection.classList.remove('hidden');
      selection.setAttribute('aria-hidden', 'false');
      if (modeSwitch) modeSwitch.classList.remove('hidden');

      if(btnWord) btnWord.checked = false;
      if(btnPhrase) btnPhrase.checked = false;
      if(btnSentence) btnSentence.checked = false;

      words = null;
      order = [];
      idx = 0;
      consumedInRound = 0;

      if (typeof window.ensureSourceListRendered === 'function') {
        window.ensureSourceListRendered();
      }
      rechooseBtn.classList.add('hidden');
    });
  }


  // Kick off typing animation on load
  window.addEventListener('load', ()=>{
    // fade in type area and run typing
    typeTextEl.style.opacity = '1';
    typeIntro(3000);
  });

})();
