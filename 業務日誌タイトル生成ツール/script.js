document.addEventListener('DOMContentLoaded', () => {

    // --- アプリ全体のデータ状態 ---
    const appState = {
        periods: [],       
        isTemp: false,     
        sa: true,          
        surname: '',       
        tasks: [],         
        customTasks: '',   
        body: ''           
    };
    const STORAGE_KEY = 'workLogAppState';

    // --- localStorage への保存 ---
    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }

    // --- localStorage からの読み込み ---
    function loadState() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            const loadedState = JSON.parse(savedData);
            if (loadedState) Object.assign(appState, loadedState);
        }
    }

    // --- リセット処理 ---
    function resetState() {
        if (confirm('入力内容をすべてリセットします。よろしいですか？')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload(); 
        }
    }
    document.getElementById('reset-btn').addEventListener('click', resetState);
    
    // --- コピーボタンのフィードバック ---
    function showCopiedFeedback(button) {
        const originalHTML = button.innerHTML;
        const width = button.offsetWidth;
        button.style.width = `${width}px`;
        
        button.innerHTML = '<i class="fas fa-check"></i> 完了';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copied');
            button.style.width = '';
        }, 1500);
    }
    
    // --- タブ切り替え機能 ---
    const tabButtons = document.querySelectorAll('.tab-btn:not(#reset-btn)');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const tabsOrder = ['title', 'task', 'text', 'output']; 
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    function updateNavButtons(currentIndex) {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === tabsOrder.length - 1;
    }

    function navigateTabs(direction) {
        const currentActiveBtn = document.querySelector('.tab-btn.active');
        const currentTabId = currentActiveBtn.dataset.tab;
        const currentIndex = tabsOrder.indexOf(currentTabId);
        
        let nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= tabsOrder.length) nextIndex = tabsOrder.length - 1;

        if (nextIndex !== currentIndex) {
            const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabsOrder[nextIndex]}"]`);
            if (targetBtn) targetBtn.click();
        }
    }

    prevBtn.addEventListener('click', () => navigateTabs(-1));
    nextBtn.addEventListener('click', () => navigateTabs(1));


    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            const targetPane = document.getElementById(button.dataset.tab + '-tab');
            if (targetPane) {
                targetPane.classList.add('active');
            }
            
            const currentIdx = tabsOrder.indexOf(button.dataset.tab);
            updateNavButtons(currentIdx); 
            
            if (button.dataset.tab === 'output') {
                outputGenerator.update();
            }
        });
    });

    // --- タイトル生成機能 ---
    const titleGenerator = {
        dateDisplay: document.getElementById('date-display'),
        periodCheckboxes: document.querySelectorAll('#period-options input'),
        saToggle: document.getElementById('sa-toggle'),
        surnameInput: document.getElementById('surname-input'),
        resultPreview: document.getElementById('title-result-preview'),
        copyButton: document.getElementById('title-copy-button'),
        
        dateString: '',

        init() {
            // 1. 日付の更新（自動）
            this.updateDate();

            // 2. appState からフォームの値を復元
            this.surnameInput.value = appState.surname;
            this.saToggle.checked = appState.sa;
            this.periodCheckboxes.forEach(cb => {
                if (cb.value === '臨時') {
                    cb.checked = appState.isTemp;
                } else {
                    cb.checked = appState.periods.includes(cb.value);
                }
            });

            // 3. イベントリスナーを設定
            const allInputs = [this.saToggle, this.surnameInput, ...this.periodCheckboxes];
            allInputs.forEach(input => {
                input.addEventListener('change', this.update.bind(this));
                input.addEventListener('input', this.update.bind(this));
            });
            this.copyButton.addEventListener('click', this.copy.bind(this));
            
            // 4. 初期プレビューを更新
            this.updatePreview();
        },

        updateDate() {
            const today = new Date();
            this.dateString = `${today.getMonth() + 1}/${today.getDate()} (${['日','月','火','水','木','金','土'][today.getDay()]})`;
            this.dateDisplay.textContent = this.dateString;
        },

        update() {
            const tempCheckbox = document.querySelector('input[value="臨時"]');
            
            appState.surname = this.surnameInput.value.trim();
            appState.sa = this.saToggle.checked;
            appState.isTemp = tempCheckbox.checked;
            
            if (appState.isTemp) {
                appState.periods = [];
            } else {
                appState.periods = Array.from(this.periodCheckboxes)
                    .filter(cb => cb.checked && cb.value !== '臨時')
                    .map(cb => cb.value);
            }
            
            saveState(); 
            this.updatePreview(); 
        },

        updatePreview() {
            let periodString = '';
            if (appState.isTemp) {
                periodString = '臨時シフト';
            } else if (appState.periods.length > 0) {
                periodString = appState.periods.join(', ') + '限';
            }
            
            const saString = appState.sa ? 'SA' : '';
            const finalTitle = [this.dateString, periodString, saString, appState.surname]
                .filter(part => part).join(' ');
            
            this.resultPreview.value = finalTitle;
        },

        copy() {
            if (this.resultPreview.value) {
                navigator.clipboard.writeText(this.resultPreview.value)
                    .then(() => showCopiedFeedback(this.copyButton))
                    .catch(err => console.error('Title copy failed', err));
            }
        }
    };

    // --- 業務内容生成機能 ---
    const taskGenerator = {
        // セレクタは全てのinputを取得するので変更なしでOK
        taskCheckboxes: document.querySelectorAll('#task-options input'),
        customTaskInput: document.getElementById('custom-task-input'),
        resultPreview: document.getElementById('task-result-preview'),
        copyButton: document.getElementById('task-copy-button'),

        init() {
            this.customTaskInput.value = appState.customTasks;
            this.taskCheckboxes.forEach(cb => {
                cb.checked = appState.tasks.includes(cb.value);
            });

            const inputs = [...this.taskCheckboxes, this.customTaskInput];
            inputs.forEach(input => {
                input.addEventListener('change', this.update.bind(this));
                input.addEventListener('input', this.update.bind(this));
            });
            this.copyButton.addEventListener('click', this.copy.bind(this));
            
            this.updatePreview();
        },

        update() {
            appState.tasks = Array.from(this.taskCheckboxes)
                .filter(cb => cb.checked).map(cb => cb.value);
            appState.customTasks = this.customTaskInput.value.trim();
            
            saveState(); 
            this.updatePreview();
        },

        updatePreview() {
            const customTasksList = appState.customTasks.split('\n')
                .map(task => task.trim()).filter(task => task);
            const allTasks = [...appState.tasks, ...customTasksList];

            if (allTasks.length > 0) {
                this.resultPreview.value = `【業務内容】${allTasks.join('、')}`;
            } else {
                this.resultPreview.value = '';
            }
        },
        
        copy() {
            if (this.resultPreview.value) {
                navigator.clipboard.writeText(this.resultPreview.value)
                    .then(() => showCopiedFeedback(this.copyButton))
                    .catch(err => console.error('Task copy failed', err));
            }
        }
    };

    // --- 本文執筆機能 ---
    const textGenerator = {
        editor: document.getElementById('text-editor'),
        charCount: document.getElementById('char-count'),
        chipButtons: document.querySelectorAll('.chip-btn'),

        init() {
            this.editor.value = appState.body;
            this.updateCharCount();

            this.editor.addEventListener('input', () => {
                this.update();
                this.updateCharCount();
            });

            // クイックインサート機能
            this.chipButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    // data-textにはHTMLで\nを入れている
                    const textToInsert = btn.dataset.text;
                    const cursorPos = this.editor.selectionStart;
                    const textBefore = this.editor.value.substring(0, cursorPos);
                    const textAfter  = this.editor.value.substring(cursorPos, this.editor.value.length);

                    // カーソル位置に挿入
                    this.editor.value = textBefore + textToInsert + textAfter;
                    
                    this.update();
                    this.updateCharCount();
                    this.editor.focus();
                });
            });
        },
        
        update() {
            appState.body = this.editor.value;
            saveState(); 
        },

        updateCharCount() {
            const count = this.editor.value.length;
            this.charCount.textContent = `(${count}文字)`;
        }
    };


    // --- 出力機能 ---
    const outputGenerator = {
        titlePreview: document.getElementById('output-title-preview'),
        titleCopyBtn: document.getElementById('output-title-copy'),
        bodyPreview: document.getElementById('output-body-preview'),
        bodyCopyBtn: document.getElementById('output-body-copy'),

        init() {
            this.titleCopyBtn.addEventListener('click', this.copyTitle.bind(this));
            this.bodyCopyBtn.addEventListener('click', this.copyBody.bind(this));
        },

        update() {
            // 1. タイトル
            const dateStr = titleGenerator.dateString; 
            let periodString = '';
            if (appState.isTemp) {
                periodString = '臨時シフト';
            } else if (appState.periods.length > 0) {
                periodString = appState.periods.join(', ') + '限';
            }
            const saString = appState.sa ? 'SA' : '';
            this.titlePreview.value = [dateStr, periodString, saString, appState.surname]
                .filter(part => part).join(' ');

            // 2. 本文
            const customTasksList = appState.customTasks.split('\n')
                .map(task => task.trim()).filter(task => task);
            const allTasks = [...appState.tasks, ...customTasksList];
            
            let combinedBody = '';
            if (allTasks.length > 0) {
                combinedBody += `【業務内容】\n${allTasks.join('、')}\n\n`; 
            }
            combinedBody += appState.body;
            
            this.bodyPreview.value = combinedBody;
        },

        copyTitle() {
            if (this.titlePreview.value) {
                navigator.clipboard.writeText(this.titlePreview.value)
                    .then(() => showCopiedFeedback(this.titleCopyBtn))
                    .catch(err => console.error('Output Title copy failed', err));
            }
        },

        copyBody() {
            if (this.bodyPreview.value) {
                navigator.clipboard.writeText(this.bodyPreview.value)
                    .then(() => showCopiedFeedback(this.bodyCopyBtn))
                    .catch(err => console.error('Output Body copy failed', err));
            }
        }
    };

    // --- 初期化 ---
    loadState();
    updateNavButtons(0); 

    titleGenerator.init(); 
    taskGenerator.init();  
    textGenerator.init();  
    outputGenerator.init();
});