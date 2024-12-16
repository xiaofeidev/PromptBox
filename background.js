// 初始化侧边栏设置
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 设置侧边栏页面
chrome.sidePanel.setOptions({
    path: 'popup.html',
    enabled: true
});

// 监听侧边栏状态变化
chrome.sidePanel.onStatusChanged.addListener(async (status) => {
    if (status === 'closed') {
        // 当侧边栏关闭时，确保下次可以正常打开
        await chrome.sidePanel.setOptions({
            path: 'popup.html',
            enabled: true
        });
    }
}); 