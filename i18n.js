// 语言配置
const translations = {
    'zh': {
        // 工具栏按钮
        'wrap_text': '自动换行',
        'theme': '切换主题',
        'new': '新建',
        'history': '历史记录',
        'copy': '复制',
        'settings': '设置',
        'clear_history': '清空历史记录',
        'close': '关闭',

        // 输入框
        'input_placeholder': '在此输入您的 prompt...',

        // 历史记录面板
        'history_title': '历史记录',

        // 设置面板
        'settings_title': '设置',
        'font_size': '字体大小',

        // 通知消息
        'copied': '已复制到剪贴板',
        'copy_failed': '复制失败',
        'no_content': '无内容可复制',
        'min_font_size': '字体大小不能小于 {size}px',
        'max_font_size': '字体大小不能大于 {size}px',
        'filename_txt_required': '文件名必须以 .txt 结尾',
        'filename_invalid_chars': '文件名包含非法字符',
        'history_cleared': '已清空所有历史记录',

        // 确认对话框
        'confirm_delete': '确定要删除 "{name}" 吗？',
        'confirm_clear_history': '确定要清空所有历史记录吗？此操作不可恢复。',
        'confirm_yes': '删除',
        'confirm_clear_yes': '清空',
        'confirm_no': '取消'
    },
    'en': {
        // Toolbar buttons
        'wrap_text': 'Word Wrap',
        'theme': 'Toggle Theme',
        'new': 'New',
        'history': 'History',
        'copy': 'Copy',
        'settings': 'Settings',
        'clear_history': 'Clear History',
        'close': 'Close',

        // Input
        'input_placeholder': 'Enter your prompt here...',

        // History panel
        'history_title': 'History',

        // Settings panel
        'settings_title': 'Settings',
        'font_size': 'Font Size',

        // Notifications
        'copied': 'Copied to clipboard',
        'copy_failed': 'Failed to copy',
        'no_content': 'No content to copy',
        'min_font_size': 'Font size cannot be smaller than {size}px',
        'max_font_size': 'Font size cannot be larger than {size}px',
        'filename_txt_required': 'Filename must end with .txt',
        'filename_invalid_chars': 'Filename contains invalid characters',
        'history_cleared': 'All history cleared',

        // Confirmation dialogs
        'confirm_delete': 'Are you sure you want to delete "{name}"?',
        'confirm_clear_history': 'Are you sure you want to clear all history? This cannot be undone.',
        'confirm_yes': 'Delete',
        'confirm_clear_yes': 'Clear',
        'confirm_no': 'Cancel'
    }
};

class I18n {
    constructor() {
        this.currentLocale = this.detectLanguage();
    }

    detectLanguage() {
        // 获取浏览器语言设置
        const lang = navigator.language.toLowerCase();
        // 如果是中文（包括简体和繁体），返回 zh，否则返回 en
        return lang.startsWith('zh') ? 'zh' : 'en';
    }

    t(key, params = {}) {
        const text = translations[this.currentLocale]?.[key] || translations['en'][key];
        if (!text) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }

        // 替换参数
        return text.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }

    // 更新 DOM 元素的文本内容
    updateElement(element, key, params = {}) {
        if (element) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('data-i18n-placeholder')) {
                    element.setAttribute('placeholder', this.t(key, params));
                }
            } else {
                element.textContent = this.t(key, params);
            }
        }
    }

    // 更新元素的 title 属性
    updateTitle(element, key, params = {}) {
        if (element) {
            element.title = this.t(key, params);
        }
    }
}

// 导出单例实例
const i18n = new I18n();
export default i18n; 