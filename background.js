// 监听插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 打开侧边栏
  await chrome.sidePanel.open({ windowId: tab.windowId });
  // 设置侧边栏
  await chrome.sidePanel.setOptions({
    enabled: true,
    path: 'popup.html'
  });
}); 