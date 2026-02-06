// 主题切换功能
(function() {
  'use strict';
  
  // 获取/创建主题切换按钮
  function initThemeToggle() {
    // 检查是否已存在主题切换开关
    let themeSwitch = document.getElementById('themeSwitch');
    
    if (!themeSwitch) {
      // 创建开关容器
      const switchLabel = document.createElement('label');
      switchLabel.className = 'theme-switch';
      switchLabel.setAttribute('aria-label', '切换明暗主题');
      
      // 创建 checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'themeSwitch';
      
      // 创建滑块
      const slider = document.createElement('span');
      slider.className = 'slider';
      
      // 组装
      switchLabel.appendChild(checkbox);
      switchLabel.appendChild(slider);
      
      // 添加到页面
      document.body.appendChild(switchLabel);
      
      themeSwitch = checkbox;
    }
    
    return themeSwitch;
  }
  
  // 应用主题
  function applyTheme(theme) {
    const html = document.documentElement;
    const themeSwitch = document.getElementById('themeSwitch');
    
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      if (themeSwitch) themeSwitch.checked = true;
    } else {
      html.setAttribute('data-theme', 'light');
      if (themeSwitch) themeSwitch.checked = false;
    }
    
    // 保存到本地存储
    localStorage.setItem('theme', theme);
  }
  
  // 切换主题
  function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }
  
  // 初始化主题
  function initTheme() {
    applyTheme('light');
  }
  
  // 键盘快捷键：Ctrl/Cmd + Shift + L
  function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  function init() {
    // 初始化主题
    initTheme();
    
    // 创建并绑定按钮
    const themeToggle = initThemeToggle();
    themeToggle.addEventListener('click', toggleTheme);
    
    
    // 设置键盘快捷键
    setupKeyboardShortcut();
  }
  
})();
