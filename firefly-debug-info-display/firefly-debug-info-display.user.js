// ==UserScript==
// @name         Firefly Debug Info Display
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  在页面右上角显示 next-debug.log 和 wallet-iframe/next-debug.log 的构建信息
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

    console.log('[Debug Script] Starting...');

    // 定义要获取的 debug 日志列表
    const debugLogs = [
        { name: 'Main App', url: `${window.location.origin}/next-debug.log`, key: 'main' },
        { name: 'Wallet iFrame', url: `${window.location.origin}/wallet-iframe/next-debug.log`, key: 'wallet' }
    ];

    // 创建悬浮容器
    const container = document.createElement('div');
    container.id = 'debug-info-container';
    container.style.cssText = `
        position: fixed;
        top: 8px;
        right: 8px;
        background: #1a1a1a;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        padding: 8px 10px;
        border-radius: 6px;
        z-index: 999999;
        max-width: 320px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.8);
        display: none;
        line-height: 1.3;
        border: 1px solid #333;
    `;

    // Hover 效果
    container.addEventListener('mouseenter', () => {
        container.style.background = '#0a0a0a';
    });
    container.addEventListener('mouseleave', () => {
        container.style.background = '#1a1a1a';
    });

    // 创建标题栏
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        cursor: pointer;
        user-select: none;
    `;
    header.innerHTML = `
        <strong style="color: #ffff00; font-size: 11px;">🔧 Build Info</strong>
        <div style="display: flex; gap: 8px; align-items: center;">
            <span id="toggle-btn" style="color: #ffffff; font-size: 10px;">▼</span>
            <span id="close-btn" style="color: #ff6b6b; cursor: pointer; font-weight: bold; font-size: 13px;">✕</span>
        </div>
    `;

    // 创建内容区域容器
    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'debug-content-wrapper';
    contentWrapper.style.cssText = `
        max-height: 400px;
        overflow-y: auto;
    `;

    // 组装容器
    container.appendChild(header);
    container.appendChild(contentWrapper);
    document.body.appendChild(container);

    // 切换展开/收起
    const STORAGE_KEY = 'firefly-debug-expanded';
    let isExpanded = localStorage.getItem(STORAGE_KEY) === 'true';

    // 初始化状态
    contentWrapper.style.display = isExpanded ? 'block' : 'none';
    const toggleBtn = document.getElementById('toggle-btn');
    if (toggleBtn) {
        toggleBtn.textContent = isExpanded ? '▼' : '▶';
    }

    // 切换按钮点击事件
    const toggleButton = document.getElementById('toggle-btn');
    if (toggleButton) {
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isExpanded = !isExpanded;
            contentWrapper.style.display = isExpanded ? 'block' : 'none';
            toggleButton.textContent = isExpanded ? '▼' : '▶';
            localStorage.setItem(STORAGE_KEY, isExpanded);
        });
    }

    // 关闭按钮点击事件
    const closeButton = document.getElementById('close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            container.style.display = 'none';
        });
    }

    // 标题栏点击事件
    header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        contentWrapper.style.display = isExpanded ? 'block' : 'none';
        const btn = document.getElementById('toggle-btn');
        if (btn) {
            btn.textContent = isExpanded ? '▼' : '▶';
        }
        localStorage.setItem(STORAGE_KEY, isExpanded);
    });

    // 存储所有日志数据
    const logData = [];

    // 获取所有 debug 日志内容
    debugLogs.forEach((log, index) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: log.url,
            onload: function(response) {
                if (response.status === 200) {
                    logData[index] = { 
                        name: log.name, 
                        content: response.responseText, 
                        success: true,
                        key: log.key 
                    };
                } else {
                    logData[index] = { 
                        name: log.name, 
                        content: `Error: Failed to load (Status: ${response.status})`, 
                        success: false,
                        key: log.key
                    };
                }
                
                // 当所有日志都加载完成后，渲染内容
                if (logData.filter(Boolean).length === debugLogs.length) {
                    renderDebugInfo();
                }
            },
            onerror: function() {
                logData[index] = { 
                    name: log.name, 
                    content: 'Error: Failed to fetch debug log', 
                    success: false,
                    key: log.key
                };
                
                // 当所有日志都加载完成后，渲染内容
                if (logData.filter(Boolean).length === debugLogs.length) {
                    renderDebugInfo();
                }
            }
        });
    });

    // 解析日志内容，支持两种格式
    function parseLogContent(logText) {
        // 尝试第一种格式: "Application Version: xxx"
        let versionMatch = logText.match(/Application Version:\s*(.+)/);
        let version = versionMatch ? versionMatch[1].trim() : null;
        
        // 如果第一种格式没找到，尝试第二种格式: 直接的 "v7.8.0"
        if (!version) {
            versionMatch = logText.match(/Application Version:\s*(.+)|^(v\d+\.\d+\.\d+)/m);
            version = versionMatch ? (versionMatch[1] || versionMatch[2])?.trim() : 'N/A';
        }

        const hashMatch = logText.match(/Latest Commit Hash:\s*(.+)/);
        const buildTimeMatch = logText.match(/Build Time:\s*(.+?)\s*UTC/);

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

        return { version, hash, age, buildTime };
    }

    // 渲染所有 debug 信息
    function renderDebugInfo() {
        console.log('[Debug Script] Rendering debug info...');
        contentWrapper.innerHTML = '';
        
        logData.forEach((log, index) => {
            // 创建单个日志模块
            const logSection = document.createElement('div');
            logSection.style.cssText = `
                margin-bottom: ${index < logData.length - 1 ? '12px' : '0'};
                padding-bottom: ${index < logData.length - 1 ? '12px' : '0'};
                border-bottom: ${index < logData.length - 1 ? '1px solid rgba(0, 255, 0, 0.2)' : 'none'};
            `;

            // 模块标题
            const logTitle = document.createElement('div');
            logTitle.style.cssText = `
                color: #ffaa00;
                font-weight: bold;
                margin-bottom: 4px;
                font-size: 10px;
            `;
            logTitle.textContent = `📦 ${log.name}`;

            // 模块内容
            const logContent = document.createElement('pre');
            logContent.style.cssText = `
                margin: 0;
                white-space: pre-wrap;
                word-wrap: break-word;
                color: ${log.success ? '#00ff00' : '#ff0000'};
                line-height: 1.3;
                font-size: 10px;
            `;
            logContent.textContent = log.content;

            logSection.appendChild(logTitle);
            logSection.appendChild(logContent);
            contentWrapper.appendChild(logSection);
        });

        // 插入版本信息到导航栏
        insertVersionToNav();
    }

    // 显示容器的函数
    window.showDebugContainer = function() {
        console.log('[Debug Script] Showing container...');
        container.style.display = 'block';
        // 如果需要，也可以展开内容
        if (!isExpanded) {
            isExpanded = true;
            contentWrapper.style.display = 'block';
            const btn = document.getElementById('toggle-btn');
            if (btn) {
                btn.textContent = '▼';
            }
            localStorage.setItem(STORAGE_KEY, isExpanded);
        }
    };

    // 插入版本信息到导航栏
    function insertVersionToNav() {
        console.log('[Debug Script] Inserting version to nav...');
        
        // 解析所有成功加载的日志
        const parsedData = {};
        logData.forEach(log => {
            if (log.success) {
                parsedData[log.key] = parseLogContent(log.content);
            }
        });

        // 等待导航栏加载
        let attempts = 0;
        const checkNav = setInterval(() => {
            attempts++;
            const nav = document.querySelector('aside.sticky > div > nav');
            
            if (nav) {
                console.log('[Debug Script] Nav found!');
                clearInterval(checkNav);

                // 检查是否已插入，避免重复
                if (nav.querySelector('#firefly-version-info')) {
                    console.log('[Debug Script] Version info already exists');
                    return;
                }

                // 主应用版本信息
                if (parsedData.main) {
                    const mainInfo = document.createElement('span');
                    mainInfo.className = 'font-medium text-gray-500';
                    mainInfo.style.cssText = 'cursor: pointer; user-select: none;';
                    mainInfo.innerHTML = `🌐 ${parsedData.main.version} • <span style="font-family: monospace;">${parsedData.main.hash}</span> • ${parsedData.main.age}`;
                    mainInfo.onclick = function(e) {
                        console.log('[Debug Script] Main version clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        window.showDebugContainer();
                        return false;
                    };
                    mainInfo.id = 'firefly-version-info';
                    
                    // 插入到导航栏第一个位置之后
                    const firstChild = nav.firstElementChild;
                    if (firstChild && firstChild.nextSibling) {
                        nav.insertBefore(mainInfo, firstChild.nextSibling);
                    } else {
                        nav.appendChild(mainInfo);
                    }
                }

                // Wallet 版本信息
                if (parsedData.wallet) {
                    const walletInfo = document.createElement('span');
                    walletInfo.className = 'font-medium text-gray-500';
                    walletInfo.style.cssText = 'cursor: pointer; user-select: none;';
                    walletInfo.innerHTML = `💰 ${parsedData.wallet.version} • <span style="font-family: monospace;">${parsedData.wallet.hash}</span> • ${parsedData.wallet.age}`;
                    walletInfo.onclick = function(e) {
                        console.log('[Debug Script] Wallet version clicked!');
                        e.preventDefault();
                        e.stopPropagation();
                        window.showDebugContainer();
                        return false;
                    };
                    walletInfo.id = 'firefly-wallet-version-info';
                    
                    // 插入到主版本信息之后
                    const mainInfo = nav.querySelector('#firefly-version-info');
                    if (mainInfo && mainInfo.nextSibling) {
                        nav.insertBefore(walletInfo, mainInfo.nextSibling);
                    } else {
                        nav.appendChild(walletInfo);
                    }
                }
                
                console.log('[Debug Script] Version info inserted successfully');
            } else if (attempts >= 100) {
                console.log('[Debug Script] Nav not found after 100 attempts');
                clearInterval(checkNav);
            }
        }, 100);

        // 10秒后停止检查
        setTimeout(() => clearInterval(checkNav), 10000);
    }

    // 添加样式美化滚动条
    const style = document.createElement('style');
    style.textContent = `
        #debug-content-wrapper::-webkit-scrollbar {
            width: 6px;
        }
        #debug-content-wrapper::-webkit-scrollbar-track {
            background: #0a0a0a;
            border-radius: 3px;
        }
        #debug-content-wrapper::-webkit-scrollbar-thumb {
            background: #00ff00;
            border-radius: 3px;
        }
        #debug-content-wrapper::-webkit-scrollbar-thumb:hover {
            background: #00cc00;
        }
        
        #firefly-version-info:hover,
        #firefly-wallet-version-info:hover {
            text-decoration: underline;
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
})();
