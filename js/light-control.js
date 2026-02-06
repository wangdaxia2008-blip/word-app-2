/* ===== 模式切换和词库列表控制 ===== */
(function() {
  /* ===== 全局状态 ===== */
  let currentMode = null; // 初始为 null，表示还没有选择模式
  let allSources = {};
  let isInitialized = false;

  /* ===== DOM ===== */
  const sourceContainer = document.querySelector("#sourceList");
  const selectionTitle = document.querySelector("#selectionTitle");
  const btnWord = document.querySelector("#btn-word");
  const btnPhrase = document.querySelector("#btn-phrase");
  const btnSentence = document.querySelector("#btn-sentence");

  if (!sourceContainer) {
    console.warn("light-control.js 未运行：未找到 sourceList 元素");
    return;
  }

  /* 模式与 sources.json 的 key 对应 */
  const modeToKey = { word: "words", phrase: "phrases", sentence: "sentences" };
  
  /* 模式与标题对应 */
  const modeToTitle = { word: "Select word list", phrase: "Select phrase list", sentence: "Select sentence list" };

  /* ===== 初始化数据 ===== */
  function initializeSources() {
    if (isInitialized) {
      return Promise.resolve();
    }
    
    return fetch("data/sources.json")
      .then(res => {
        if (!res.ok) throw new Error('Failed to load sources');
        return res.json();
      })
      .then(data => {
        allSources = data;
        isInitialized = true;
        return allSources;
      })
      .catch(err => {
        console.warn("加载词库列表失败", err);
        // 使用默认数据
        allSources = {
          words: [{ file: "words/word1.json", id: "word1", label: "示例词库1" }],
          phrases: [{ file: "phrases/word4.json", id: "phrase1", label: "示例词组" }],
          sentences: [{ file: "sentences/word3.json", id: "sentence1", label: "示例句子" }]
        };
        isInitialized = true;
        return allSources;
      });
  }

  /* ===== 进入选择页时，不渲染词库列表，等待用户点击模式按钮 ===== */
  function ensureSourceListRendered() {
    // 初始化数据但不渲染
    initializeSources();
    // 清空词库列表
    if (sourceContainer) {
      sourceContainer.innerHTML = "";
    }
    // 重置标题为默认
    if (selectionTitle) {
      selectionTitle.textContent = "Turn on the switch to select a file";
    }
    // 重置当前模式
    currentMode = null;
  }

  // 暴露给 app.js 调用
  window.ensureSourceListRendered = ensureSourceListRendered;

  /* ===== 模式切换 ===== */
  function setupModeListeners() {
    if (btnWord) {
      btnWord.addEventListener('change', () => {
        if (btnWord.checked) switchMode("word");
      });
    }
    if (btnPhrase) {
      btnPhrase.addEventListener('change', () => {
        if (btnPhrase.checked) switchMode("phrase");
      });
    }
    if (btnSentence) {
      btnSentence.addEventListener('change', () => {
        if (btnSentence.checked) switchMode("sentence");
      });
    }
  }

  function switchMode(mode) {
    // 更新标题
    if (selectionTitle) {
      selectionTitle.textContent = modeToTitle[mode] || "选择词库";
    }

    // 如果是同一个模式，不需要重新渲染
    if (mode === currentMode) return;

    currentMode = mode;

    // 添加淡出效果
    sourceContainer.classList.add("fade");
    
    // 确保数据已加载，然后渲染
    initializeSources().then(() => {
      setTimeout(() => {
        renderSources();
      }, 220);
    });
  }

  /* ===== 渲染词库 ===== */
  function renderSources() {
    if (!sourceContainer) return;
    
    sourceContainer.innerHTML = "";

    // 如果还没选择模式，显示提示
    if (!currentMode) {
      sourceContainer.classList.remove("fade");
      return;
    }

    const key = modeToKey[currentMode];
    const list = allSources[key] || [];

    if (list.length === 0) {
      const emptyItem = document.createElement("div");
      emptyItem.className = "source-item";
      emptyItem.textContent = "暂无可用词库";
      emptyItem.style.cursor = "default";
      emptyItem.style.opacity = "0";
      sourceContainer.appendChild(emptyItem);
      
      // 淡入动画
      setTimeout(() => {
        emptyItem.style.transition = "opacity 0.35s ease";
        emptyItem.style.opacity = "1";
      }, 10);
      
      sourceContainer.classList.remove("fade");
      return;
    }

    // 创建所有词库项
    list.forEach((item, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "source-item";
      itemEl.textContent = item.label || item.name || item.id || item.file;
      itemEl.style.opacity = "0";
      itemEl.style.transform = "translateY(10px)";

      itemEl.onclick = () => {
        selectSource(item);
      };

      sourceContainer.appendChild(itemEl);
      
      // 依次淡入动画
      setTimeout(() => {
        itemEl.style.transition = "all 0.35s ease";  // 👈 改成all，覆盖CSS但包含所有属性
        itemEl.style.opacity = "1";
        itemEl.style.transform = "translateY(0)";
        
        // 然后淡入完成后改回CSS的时长
        setTimeout(() => {
          itemEl.style.transition = "all 0.3s";  // 和CSS保持一致
        }, 350);
      }, 50 + index * 30);
    });

    // 移除淡出效果
    sourceContainer.classList.remove("fade");
  }

  /* ===== 选中词库：调用 app.js 的 window.startLearning ===== */
  function selectSource(source) {
    if (typeof window.startLearning === "function") {
      window.startLearning(source);
    } else {
      console.warn("window.startLearning 未定义，无法开始学习");
      console.log("选择词库：", source);
    }
  }

  /* ===== 初始化 ===== */
  // 设置事件监听器
  setupModeListeners();
  
  // 预加载数据（可选）
  initializeSources();

})();
