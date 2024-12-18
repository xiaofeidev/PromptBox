import i18n from './i18n.js';

class PromptBox {
    constructor() {
        this.currentPrompt = '';
        this.prompts = [];
        this.preferences = {
            wordWrap: true,
            theme: 'system',
            fontSize: 15
        };
        this.minFontSize = 12;
        this.maxFontSize = 24;
        this.initElements();
        this.initEventListeners();
        this.loadData();
        this.initI18n();
    }

    initI18n() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            i18n.updateElement(element, element.getAttribute('data-i18n'));
        });

        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            i18n.updateTitle(element, element.getAttribute('data-i18n-title'));
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            i18n.updateElement(element, element.getAttribute('data-i18n-placeholder'));
        });
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

    showNotification(key, params = {}) {
        const message = i18n.t(key, params);
        this.notificationText.textContent = message;
        this.notification.classList.remove('hidden');
        setTimeout(() => this.notification.classList.add('show'), 10);
        
        setTimeout(() => {
            this.notification.classList.remove('show');
            setTimeout(() => this.notification.classList.add('hidden'), 300);
        }, 2000);
    }

    async loadData() {
        const result = await chrome.storage.local.get(['currentPrompt', 'prompts', 'preferences']);
        this.currentPrompt = result.currentPrompt || '';
        this.prompts = result.prompts || [];
        
        this.preferences = {
            wordWrap: true,
            theme: 'system',
            fontSize: 15,
            ...result.preferences,
            wordWrap: result.preferences?.wordWrap ?? true
        };
        
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

    isChineseChar(char) {
        return /[\u4e00-\u9fa5]/.test(char);
    }

    getContentPrefix(content) {
        let units = [];
        let currentWord = '';
        let consecutiveUnits = 0;
        let bestPrefix = null;
        let lastWasSpace = false;

        const processCurrentWord = () => {
            if (currentWord) {
                if (lastWasSpace && units.length > 0) {
                    units.push({ text: ' ', units: 0 });
                }
                units.push({ text: currentWord, units: 2 });
                consecutiveUnits += 2;
                currentWord = '';
            }
        };

        for (let i = 0; i < content.length && !bestPrefix; i++) {
            const char = content[i];
            
            if (this.isChineseChar(char)) {
                processCurrentWord();
                if (lastWasSpace && units.length > 0) {
                    units.push({ text: ' ', units: 0 });
                }
                units.push({ text: char, units: 1 });
                consecutiveUnits += 1;
                lastWasSpace = false;
            } else if (/\s/.test(char)) {
                processCurrentWord();
                lastWasSpace = true;
            } else {
                currentWord += char;
                lastWasSpace = false;
            }

            if (consecutiveUnits >= 10 && !bestPrefix) {
                let prefix = '';
                let currentUnits = 0;
                
                for (let unit of units) {
                    prefix += unit.text;
                    currentUnits += unit.units;
                    if (currentUnits >= 10) {
                        bestPrefix = prefix;
                        break;
                    }
                }
            }
        }

        if (!bestPrefix && currentWord) {
            processCurrentWord();
            if (consecutiveUnits >= 10 && !bestPrefix) {
                let prefix = '';
                let currentUnits = 0;
                
                for (let unit of units) {
                    prefix += unit.text;
                    currentUnits += unit.units;
                    if (currentUnits >= 10) {
                        bestPrefix = prefix;
                        break;
                    }
                }
            }
        }

        return bestPrefix;
    }

    toggleHistory() {
        this.historyPanel.classList.toggle('hidden');
    }

    async copyPrompt() {
        const text = this.promptInput.value.trim();
        if (!text) {
            this.showNotification('no_content');
            return;
        }
            
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('copied');
        } catch (err) {
            this.showNotification('copy_failed');
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
                    this.showNotification('filename_txt_required');
                    input.focus();
                    return;
                }
                
                if (!/^[^\\/:*?"<>|]+$/.test(newName)) {
                    this.showNotification('filename_invalid_chars');
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
            <div class="confirm-message">${i18n.t('confirm_delete', { name: prompt.fileName })}</div>
            <div class="confirm-buttons">
                <button class="confirm-button confirm-yes">${i18n.t('confirm_yes')}</button>
                <button class="confirm-button confirm-no">${i18n.t('confirm_no')}</button>
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
            this.showNotification('min_font_size', { size: this.minFontSize });
            this.preferences.fontSize = this.minFontSize;
        } else if (newSize > this.maxFontSize) {
            this.showNotification('max_font_size', { size: this.maxFontSize });
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
            <div class="confirm-message">${i18n.t('confirm_clear_history')}</div>
            <div class="confirm-buttons">
                <button class="confirm-button confirm-yes">${i18n.t('confirm_clear_yes')}</button>
                <button class="confirm-button confirm-no">${i18n.t('confirm_no')}</button>
            </div>
        `;
        
        const handleConfirm = async (confirmed) => {
            if (confirmed) {
                this.prompts = [];
                this.currentPrompt = '';
                this.promptInput.value = '';
                await this.savePrompts();
                this.updateHistoryList();
                this.showNotification('history_cleared');
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