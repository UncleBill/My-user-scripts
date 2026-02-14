// ==UserScript==
// @name         Firefly Debug Info Display
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在页面右上角显示 next-debug.log 的构建信息
// @author       You
// @match        https://firefly.social/*
// @match        https://*.firefly.social/*
// @match        https://firefly-social-*.dimension-dev.vercel.app/*
// @grant        GM_xmlhttpRequest
// @connect      firefly.social
// @connect      vercel.app
// ==/UserScript==

(function() {
    'use strict';

    // 如果在 iframe 中则不执行
    if (window.self !== window.top) {
        return;
    }

    // 获取 debug 日志的 URL
    const debugLogUrl = `${window.location.origin}/next-debug.log`;

    // 创建悬浮容器
    const container = document.createElement('div');
    container.id = 'debug-info-container';
    container.style.cssText = `
        position: fixed;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.5);
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        padding: 6px 8px;
        border-radius: 4px;
        z-index: 999999;
        max-width: 280px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        transition: background 0.2s ease;
        display: none;
        line-height: 1.3;
        visibility: hidden;
    `;

    // Hover 效果
    container.addEventListener('mouseenter', () => {
        container.style.background = 'rgba(0, 0, 0, 0.95)';
    });
    container.addEventListener('mouseleave', () => {
        container.style.background = 'rgba(0, 0, 0, 0.5)';
    });

    // 创建标题栏
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        cursor: pointer;
        user-select: none;
    `;
    header.innerHTML = `
        <strong style="color: #ffff00; font-size: 11px;">🔧 Build Info</strong>
        <div style="display: flex; gap: 6px; align-items: center;">
            <span id="toggle-btn" style="color: #ffffff; font-size: 10px;">▼</span>
            <span id="close-btn" style="color: #ff6b6b; cursor: pointer; font-weight: bold; font-size: 12px;">✕</span>
        </div>
    `;

    // 创建内容区域
    const content = document.createElement('pre');
    content.id = 'debug-content';
    content.style.cssText = `
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: 200px;
        overflow-y: auto;
        color: #00ff00;
        line-height: 1.3;
    `;

    // 组装容器
    container.appendChild(header);
    container.appendChild(content);
    document.body.appendChild(container);

    // 切换展开/收起
    const STORAGE_KEY = 'firefly-debug-expanded';
    let isExpanded = localStorage.getItem(STORAGE_KEY) === 'true'; // 默认收起

    // 初始化状态
    content.style.display = isExpanded ? 'block' : 'none';
    document.getElementById('toggle-btn').textContent = isExpanded ? '▼' : '▶';

    // 切换按钮点击事件
    document.getElementById('toggle-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        isExpanded = !isExpanded;
        content.style.display = isExpanded ? 'block' : 'none';
        document.getElementById('toggle-btn').textContent = isExpanded ? '▼' : '▶';
        localStorage.setItem(STORAGE_KEY, isExpanded);
    });

    // 关闭按钮点击事件
    document.getElementById('close-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        container.remove();
    });

    // 标题栏点击事件（保持原有功能）
    header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        content.style.display = isExpanded ? 'block' : 'none';
        document.getElementById('toggle-btn').textContent = isExpanded ? '▼' : '▶';
        localStorage.setItem(STORAGE_KEY, isExpanded);
    });

    // 获取 debug 日志内容
    GM_xmlhttpRequest({
        method: 'GET',
        url: debugLogUrl,
        onload: function(response) {
            if (response.status === 200) {
                content.textContent = response.responseText;
                container.style.display = 'block';

                // 解析并插入版本信息到导航栏
                insertVersionToNav(response.responseText);
            } else {
                content.textContent = `Error: Failed to load debug log (Status: ${response.status})`;
                content.style.color = '#ff0000';
                container.style.display = 'block';
            }
        },
        onerror: function() {
            content.textContent = 'Error: Failed to fetch debug log';
            content.style.color = '#ff0000';
            container.style.display = 'block';
        }
    });

    // 插入版本信息到导航栏
    function insertVersionToNav(logText) {
        // 解析日志内容
        const versionMatch = logText.match(/Application Version: (.*)/);
        const hashMatch = logText.match(/Latest Commit Hash: (.*)/);
        const buildTimeMatch = logText.match(/Build Time: (.*?) UTC/);

        const version = versionMatch ? versionMatch[1].trim() : 'N/A';
        const hash = hashMatch ? hashMatch[1].trim().substring(0, 7) : 'N/A';
        const buildTime = buildTimeMatch ? buildTimeMatch[1].trim() : null;

        // 计算部署时长
        let age = 'N/A';
        if (buildTime) {
            const buildDate = new Date(buildTime + ' UTC');
            const now = new Date();
            const diffMs = now - buildDate;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 0) {
                age = `${diffDays}d`;
            } else if (diffHours > 0) {
                age = `${diffHours}h`;
            } else {
                age = `${diffMins}m`;
            }
        }

        // 等待导航栏加载
        const checkNav = setInterval(() => {
            const nav = document.querySelector('aside.sticky > div > nav');
            if (nav) {
                clearInterval(checkNav);

                // 检查是否已插入，避免重复
                if (nav.querySelector('#firefly-version-info')) {
                    return;
                }

                // 创建版本信息元素
                const versionInfo = document.createElement('span');
                versionInfo.id = 'firefly-version-info';
                versionInfo.className = 'font-medium text-gray-500';
                versionInfo.style.cssText = 'cursor: pointer; user-select: none;';
                versionInfo.innerHTML = `${version} • <span style="font-family: monospace;">${hash}</span> • ${age}`;

                // 点击显示右上角详细信息
                versionInfo.addEventListener('click', () => {
                    container.style.visibility = 'visible';
                    container.style.display = 'block';
                });

                // 插入到导航栏第一个位置之后（在版权信息之后）
                const firstChild = nav.firstElementChild;
                if (firstChild && firstChild.nextSibling) {
                    nav.insertBefore(versionInfo, firstChild.nextSibling);
                } else {
                    nav.appendChild(versionInfo);
                }
            }
        }, 100);

        // 10秒后停止检查
        setTimeout(() => clearInterval(checkNav), 10000);
    }

    // 添加样式美化滚动条
    const style = document.createElement('style');
    style.textContent = `
        #debug-content::-webkit-scrollbar {
            width: 6px;
        }
        #debug-content::-webkit-scrollbar-track {
            background: #1a1a1a;
            border-radius: 3px;
        }
        #debug-content::-webkit-scrollbar-thumb {
            background: #00ff00;
            border-radius: 3px;
        }
        #debug-content::-webkit-scrollbar-thumb:hover {
            background: #00cc00;
        }
    `;
    document.head.appendChild(style);
})();
