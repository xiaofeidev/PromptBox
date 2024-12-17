// 初始化侧边栏设置
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 监听侧边栏状态变化
chrome.sidePanel.onStatusChanged.addListener(async (status) => {
    if (status === 'closed') {
        // 当侧边栏关闭时，确保下次可以正常打开
        await chrome.sidePanel.setOptions({
            enabled: true
        });
    }
}); 