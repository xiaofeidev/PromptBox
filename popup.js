class PromptBox {
    constructor() {
        this.currentPrompt = '';
        this.prompts = [];
        this.preferences = {
            wordWrap: true,
            theme: 'system',
            fontSize: 15  // 默认字体大小
        };
        this.minFontSize = 12;  // 最小字体大小
        this.maxFontSize = 24;  // 最大字体大小
        this.initElements();
        this.initEventListeners();
        this.loadData();
    }

    initElements() {
        this.promptInput = document.getElementById('promptInput');
        this.wrapButton = document.getElementById('wrapButton');
        this.themeButton = document.getElementById('themeButton');
        this.newButton = document.getElementById('newButton');
        this.historyButton = document.getElementById('historyButton');
        this.copyButton = document.getElementById('copyButton');
        this.historyPanel = document.getElementById('historyPanel');
        this.closeHistory = document.getElementById('closeHistory');
        this.historyList = document.getElementById('historyList');
        this.notification = document.getElementById('notification');
        this.notificationText = document.getElementById('notificationText');
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.closeSettings = document.getElementById('closeSettings');
        this.decreaseFontSize = document.getElementById('decreaseFontSize');
        this.increaseFontSize = document.getElementById('increaseFontSize');
        this.fontSizeDisplay = document.getElementById('fontSizeDisplay');
        this.clearHistory = document.getElementById('clearHistory');
    }

    initEventListeners() {
        this.wrapButton.addEventListener('click', () => this.toggleWrap());
        this.themeButton.addEventListener('click', () => this.cycleTheme());
        this.newButton.addEventListener('click', () => this.createNewPrompt());
        this.historyButton.addEventListener('click', () => this.toggleHistory());
        this.closeHistory.addEventListener('click', () => this.toggleHistory());
        this.copyButton.addEventListener('click', () => this.copyPrompt());
        this.promptInput.addEventListener('input', () => this.handleInput());
        this.settingsButton.addEventListener('click', () => this.toggleSettings());
        this.closeSettings.addEventListener('click', () => this.toggleSettings());
        this.decreaseFontSize.addEventListener('click', () => this.changeFontSize(-1));
        this.increaseFontSize.addEventListener('click', () => this.changeFontSize(1));
        this.clearHistory.addEventListener('click', () => this.confirmClearHistory());
    }

    showNotification(message, duration = 2000) {
        this.notificationText.textContent = message;
        this.notification.classList.remove('hidden');
        setTimeout(() => this.notification.classList.add('show'), 10);
        
        setTimeout(() => {
            this.notification.classList.remove('show');
            setTimeout(() => this.notification.classList.add('hidden'), 300);
        }, duration);
    }

    async loadData() {
        const result = await chrome.storage.local.get(['currentPrompt', 'prompts', 'preferences']);
        this.currentPrompt = result.currentPrompt || '';
        this.prompts = result.prompts || [];
        
        // 确保首选项中包含所有默认值
        this.preferences = {
            wordWrap: true,
            theme: 'system',
            fontSize: 15,
            ...result.preferences,
            wordWrap: result.preferences?.wordWrap ?? true
        };
        
        // 应用保存的首选项
        if (!this.preferences.wordWrap) {
            this.toggleWrap(false);
        }
        if (this.preferences.theme !== 'system') {
            document.body.setAttribute('data-theme', this.preferences.theme);
        }
        this.applyFontSize();
        
        this.promptInput.value = this.currentPrompt;
        this.updateHistoryList();
    }

    toggleWrap(save = true) {
        this.wrapButton.classList.toggle('active');
        this.promptInput.classList.toggle('wrap-text');
        this.promptInput.classList.toggle('no-wrap');
        
        if (save) {
            this.preferences.wordWrap = this.wrapButton.classList.contains('active');
            this.savePreferences();
        }
    }

    cycleTheme() {
        const themes = ['system', 'green', 'dark'];
        const currentTheme = document.body.getAttribute('data-theme') || 'system';
        const nextThemeIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        const nextTheme = themes[nextThemeIndex];
        
        if (nextTheme === 'system') {
            document.body.removeAttribute('data-theme');
        } else {
            document.body.setAttribute('data-theme', nextTheme);
        }
        
        this.preferences.theme = nextTheme;
        this.savePreferences();
    }

    async savePreferences() {
        await chrome.storage.local.set({ preferences: this.preferences });
    }

    async createNewPrompt() {
        if (this.promptInput.value.trim() === '' && this.prompts.length > 0) {
            return;
        }

        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/[\/]/g, '-');
        
        const fileName = `${timestamp}.txt`;
        
        const promptData = {
            fileName,
            content: '',
            timestamp: now.toISOString()
        };

        this.prompts.unshift(promptData);
        await this.savePrompts();
        this.promptInput.value = '';
        this.currentPrompt = '';
        this.updateHistoryList();
    }

    // 判断是否为汉字
    isChineseChar(char) {
        return /[\u4e00-\u9fa5]/.test(char);
    }

    // 获取文本前缀
    getContentPrefix(content) {
        let prefix = '';
        let chineseCount = 0;
        let wordCount = 0;
        let currentWord = '';
        let hasPrefix = false;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            
            if (this.isChineseChar(char)) {
                // 处理汉字
                if (currentWord) {
                    wordCount++;
                    currentWord = '';
                }
                chineseCount++;
                prefix += char;
                
                if (chineseCount >= 10) {
                    hasPrefix = true;
                    break;
                }
            } else if (/[a-zA-Z]/.test(char)) {
                // 处理英文字母
                currentWord += char;
            } else if (char === ' ' || char === '\n' || char === '\t') {
                // 处理分隔符
                if (currentWord) {
                    wordCount++;
                    prefix += (prefix ? ' ' : '') + currentWord;
                    currentWord = '';
                    
                    if (wordCount >= 5) {
                        hasPrefix = true;
                        break;
                    }
                }
            }
        }

        // 处理最后一个单词
        if (currentWord && wordCount < 5) {
            wordCount++;
            prefix += (prefix ? ' ' : '') + currentWord;
        }

        // 如果既没有达到 10 个汉字也没有达到 5 个单词，返回 null
        if (!hasPrefix && chineseCount < 10 && wordCount < 5) {
            return null;
        }

        return prefix.trim();
    }

    toggleHistory() {
        this.historyPanel.classList.toggle('hidden');
    }

    async copyPrompt() {
        const text = this.promptInput.value.trim();
        if (!text) {
            this.showNotification('无内容可复制');
            return;
        }
            
        
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('已复制到剪贴板');
        } catch (err) {
            this.showNotification('复制失败');
        }
    }

    async handleInput() {
        const content = this.promptInput.value;
        this.currentPrompt = content;
        
        if (this.prompts.length === 0) {
            await this.createNewPrompt();
        }
        
        const currentPromptData = this.prompts[0];
        currentPromptData.content = content;

        // 如果文件名还没有包含内容前缀
        if (currentPromptData.fileName.indexOf('_') === -1) {
            const prefix = this.getContentPrefix(content);
            if (prefix) {
                const timestamp = currentPromptData.fileName.split('.')[0];
                const safePrefix = prefix.replace(/[\\/:*?"<>|]/g, '_');
                currentPromptData.fileName = `${timestamp}_${safePrefix}.txt`;
            }
        }

        await this.savePrompts();
        this.updateHistoryList();
    }

    async savePrompts() {
        await chrome.storage.local.set({
            currentPrompt: this.currentPrompt,
            prompts: this.prompts
        });
    }

    updateHistoryList() {
        this.historyList.innerHTML = '';
        this.prompts.forEach((prompt, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const nameContainer = document.createElement('div');
            nameContainer.className = 'history-item-name';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = prompt.fileName;
            nameSpan.style.cursor = 'text';
            
            // 创建一个编辑按钮
            const editButton = document.createElement('button');
            editButton.className = 'tool-button edit-button';
            editButton.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
            editButton.title = '重命名';
            editButton.onclick = (e) => {
                e.stopPropagation();
                this.startRename(nameSpan, prompt);
            };
            
            const actions = document.createElement('div');
            actions.className = 'history-item-actions';
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'tool-button';
            deleteButton.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            deleteButton.title = '删除';
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                this.confirmDelete(index);
            };
            
            nameContainer.appendChild(nameSpan);
            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
            
            item.appendChild(nameContainer);
            item.appendChild(actions);
            
            item.onclick = () => this.loadPrompt(index);
            
            this.historyList.appendChild(item);
        });
    }

    startRename(nameSpan, prompt) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = prompt.fileName;
        
        const finishRename = async () => {
            const newName = input.value.trim();
            if (newName && newName !== prompt.fileName) {
                if (!newName.endsWith('.txt')) {
                    this.showNotification('文件名必须以 .txt 结尾');
                    input.focus();
                    return;
                }
                
                if (!/^[^\\/:*?"<>|]+$/.test(newName)) {
                    this.showNotification('文件名包含非法字符');
                    input.focus();
                    return;
                }
                
                prompt.fileName = newName;
                await this.savePrompts();
                this.updateHistoryList();
            } else {
                nameSpan.textContent = prompt.fileName;
                input.replaceWith(nameSpan);
            }
        };
        
        input.onclick = (e) => e.stopPropagation();
        input.onblur = finishRename;
        input.onkeydown = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                finishRename();
            } else if (e.key === 'Escape') {
                input.value = prompt.fileName;
                input.replaceWith(nameSpan);
            }
        };
        
        nameSpan.replaceWith(input);
        input.focus();
        input.select();
    }

    async confirmDelete(index) {
        const prompt = this.prompts[index];
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'confirm-delete';
        confirmDiv.innerHTML = `
            <div class="confirm-message">确定要删除 "${prompt.fileName}" 吗？</div>
            <div class="confirm-buttons">
                <button class="confirm-button confirm-yes">删除</button>
                <button class="confirm-button confirm-no">取消</button>
            </div>
        `;
        
        const handleConfirm = async (confirmed) => {
            if (confirmed) {
                this.prompts.splice(index, 1);
                await this.savePrompts();
                this.updateHistoryList();
                
                if (index === 0) {
                    this.promptInput.value = '';
                    this.currentPrompt = '';
                }
            }
            confirmDiv.remove();
        };
        
        confirmDiv.querySelector('.confirm-yes').onclick = () => handleConfirm(true);
        confirmDiv.querySelector('.confirm-no').onclick = () => handleConfirm(false);
        
        this.historyPanel.appendChild(confirmDiv);
    }

    async loadPrompt(index) {
        const prompt = this.prompts[index];
        
        if (index !== 0) {
            this.prompts.splice(index, 1);
            this.prompts.unshift(prompt);
        }
        
        this.currentPrompt = prompt.content;
        this.promptInput.value = prompt.content;
        await this.savePrompts();
        this.updateHistoryList();
        this.toggleHistory();
    }

    toggleSettings() {
        this.settingsPanel.classList.toggle('hidden');
        if (!this.settingsPanel.classList.contains('hidden')) {
            this.historyPanel.classList.add('hidden');
        }
    }

    changeFontSize(delta) {
        const newSize = this.preferences.fontSize + delta;
        if (newSize < this.minFontSize) {
            this.showNotification(`字体大小不能小于 ${this.minFontSize}px`);
            this.preferences.fontSize = this.minFontSize;
        } else if (newSize > this.maxFontSize) {
            this.showNotification(`字体大小不能大于 ${this.maxFontSize}px`);
            this.preferences.fontSize = this.maxFontSize;
        } else {
            this.preferences.fontSize = newSize;
        }
        
        this.applyFontSize();
        this.savePreferences();
    }

    applyFontSize() {
        this.promptInput.style.fontSize = `${this.preferences.fontSize}px`;
        this.fontSizeDisplay.textContent = `${this.preferences.fontSize}px`;
    }

    async confirmClearHistory() {
        const confirmDiv = document.createElement('div');
        confirmDiv.className = 'confirm-delete';
        confirmDiv.innerHTML = `
            <div class="confirm-message">确定要清空所有历史记录吗？此操作不可恢复。</div>
            <div class="confirm-buttons">
                <button class="confirm-button confirm-yes">清空</button>
                <button class="confirm-button confirm-no">取消</button>
            </div>
        `;
        
        const handleConfirm = async (confirmed) => {
            if (confirmed) {
                // 清空所有历史记录
                this.prompts = [];
                this.currentPrompt = '';
                this.promptInput.value = '';
                await this.savePrompts();
                this.updateHistoryList();
                this.showNotification('已清空所有历史记录');
            }
            confirmDiv.remove();
        };
        
        confirmDiv.querySelector('.confirm-yes').onclick = () => handleConfirm(true);
        confirmDiv.querySelector('.confirm-no').onclick = () => handleConfirm(false);
        
        this.historyPanel.appendChild(confirmDiv);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PromptBox();
}); 