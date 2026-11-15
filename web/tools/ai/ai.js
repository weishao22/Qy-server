// 前端 AI 聊天功能 (完整版)
(function () {
    'use strict';

    // ==================== 功能开关 ====================
    const ENABLE_LOCAL_STORAGE = true;   // 是否启用本地存储（true=启用，false=禁用）
    const STORAGE_KEY = 'ai_chat_history';
    const is_debug = true;               // 是否显示调试信息

    // ==================== 配置 ====================
    const config = {
        apiUrl: 'https://api.qyserver.top/api/ai/stream',
        // apiUrl: 'http://localhost:3001/api/ai/stream',  // 本地测试用
        maxHistoryChars: 2000,
        timeout: 60000,
    };

    // ==================== DOM 引用 ====================
    const messagesEl = document.getElementById('messages');
    const promptEl = document.getElementById('prompt');
    const sendBtn = document.getElementById('sendBtn');

    // ==================== 状态 ====================
    let messageHistory = [];

    const tokenStats = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cacheHitTokens: 0,

        reset() {
            this.promptTokens = 0;
            this.completionTokens = 0;
            this.totalTokens = 0;
            this.cacheHitTokens = 0;
        },

        getSummary() {
            return `- 共消耗: ${this.totalTokens} | 输入:${this.promptTokens}, 命中:${this.cacheHitTokens}, 输出:${this.completionTokens}`;
        }
    };

    // ==================== 本地存储管理 ====================
    function saveHistoryToLocal() {
        if (!ENABLE_LOCAL_STORAGE) return;
        try {
            const data = {
                history: messageHistory,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('保存聊天记录失败:', e);
        }
    }

    function loadHistoryFromLocal() {
        if (!ENABLE_LOCAL_STORAGE) return false;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (Array.isArray(data.history)) {
                messageHistory = data.history;
                return true;
            }
            return false;
        } catch (e) {
            console.warn('读取聊天记录失败:', e);
            return false;
        }
    }

    function clearLocalHistory() {
        if (!ENABLE_LOCAL_STORAGE) return;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { }
    }

    // ==================== UI 辅助 ====================
    function getPlaceholder() {
        return document.getElementById('emptyPlaceholder');
    }

    function hidePlaceholder() {
        const ph = getPlaceholder();
        if (ph) ph.style.display = 'none';
    }

    function showPlaceholder() {
        const ph = getPlaceholder();
        if (ph) ph.style.display = '';
    }

    function appendMessage(text, role) {
        // 隐藏占位（有消息时）
        hidePlaceholder();

        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = role === 'user' ? 'flex-end' : 'flex-start';
        const div = document.createElement('div');
        div.className = 'msg ' + role;
        if (role === 'bot' && text && typeof marked === 'function') {
            div.innerHTML = marked.parse(text);
        } else {
            div.textContent = text;
        }
        wrapper.appendChild(div);
        messagesEl.appendChild(wrapper);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return { wrapper, div };
    }

    const thinkTextList = [
        "思考中...",
        "烧烤中...",
        "深度烧烤中...",
        "少女祈祷中..."
    ];

    function showThinking() {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'flex-start';
        const div = document.createElement('div');
        div.className = 'msg bot';
        div.style.color = '#aaa';
        div.textContent = thinkTextList[Math.floor(Math.random() * thinkTextList.length)];
        wrapper.appendChild(div);
        messagesEl.appendChild(wrapper);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return wrapper;
    }

    function removeElement(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    function clearInput() { promptEl.value = ''; }
    function getInputValue() { return promptEl.value.trim(); }

    function getTotalChars(history) {
        return history.reduce((sum, msg) => sum + (msg.content || '').length, 0);
    }

    function trimHistory(history, maxChars) {
        while (history.length >= 2 && getTotalChars(history) > maxChars) {
            history.shift();
            history.shift();
        }
    }

    // ==================== 流式请求 ====================
    async function* streamFromBackend(messages) {
        const payload = { messages: messages };
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(config.timeout)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.error || `HTTP ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                    const jsonStr = trimmed.slice(5).trim();
                    if (jsonStr === '[DONE]') return;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        yield parsed;
                    } catch (e) { /* 忽略 */ }
                }
            }
        }
    }

    // ==================== 清空历史（暴露） ====================
    function clearHistory() {
        messageHistory = [];
        clearLocalHistory();

        // 移除所有消息元素（保留占位）
        const msgs = messagesEl.querySelectorAll('.msg');
        msgs.forEach(el => el.remove());

        // 移除可能存在的 debug 信息
        const debugEls = messagesEl.querySelectorAll('details, .token-info');
        debugEls.forEach(el => el.remove());

        // 恢复占位
        showPlaceholder();
    }

    // ==================== 主发送逻辑 ====================
    async function sendMessage(userText) {
        if (!userText) return;

        appendMessage(userText, 'user');
        clearInput();
        messageHistory.push({ role: 'user', content: userText });
        // 保存用户消息（实时保存）
        saveHistoryToLocal();

        const thinkingWrapper = showThinking();
        tokenStats.reset();

        let finalReply = '';
        let tokenInfoText = '';
        let botMessageWrapper = null;
        let botMessageDiv = null;

        function ensureBotContainer() {
            if (!botMessageWrapper) {
                const result = appendMessage('', 'bot');
                botMessageWrapper = result.wrapper;
                botMessageDiv = result.div;
            }
        }

        function streamUpdate(text) {
            ensureBotContainer();
            if (botMessageDiv) {
                if (typeof marked === 'function') {
                    botMessageDiv.innerHTML = marked.parse(text);
                } else {
                    botMessageDiv.textContent = text;
                }
            }
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function finalRender(text) {
            ensureBotContainer();
            if (botMessageDiv) {
                if (typeof marked === 'function') {
                    botMessageDiv.innerHTML = marked.parse(text);
                } else {
                    botMessageDiv.textContent = text;
                }
            }
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function appendDebugInfo(chunks) {
            if (!botMessageWrapper) return;
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'margin-top:8px;';
            const details = document.createElement('details');
            details.style.cssText = 'font-size:11px;';
            const summary = document.createElement('summary');
            summary.style.cssText = 'color:#999;cursor:pointer;';
            summary.textContent = `📋 原始响应 (${chunks.length} 块)`;
            details.appendChild(summary);
            const pre = document.createElement('pre');
            pre.style.cssText = 'background:#f5f5f5;padding:8px;border-radius:4px;overflow-x:auto;max-height:300px;font-size:10px;color:#666;margin-top:4px;';
            pre.textContent = JSON.stringify(chunks, null, 2);
            details.appendChild(pre);
            wrapper.appendChild(details);
            botMessageWrapper.insertAdjacentElement('afterend', wrapper);
        }

        try {
            let rawChunks = [];

            for await (const chunk of streamFromBackend(messageHistory)) {
                rawChunks.push(chunk);

                // 🟢 解析后端推送的自定义事件
                if (chunk.type === 'status') {
                    const statusWrapper = document.createElement('div');
                    statusWrapper.style.display = 'flex';
                    statusWrapper.style.justifyContent = 'flex-start';
                    statusWrapper.style.marginTop = '2px';
                    const statusDiv = document.createElement('div');
                    statusDiv.style.cssText = 'color:#999;font-size:11px;white-space: pre-wrap;';
                    statusDiv.textContent = chunk.text;
                    statusWrapper.appendChild(statusDiv);
                    messagesEl.appendChild(statusWrapper);
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                    continue;
                }

                const delta = chunk.choices?.[0]?.delta;
                if (delta?.content) {
                    if (!finalReply) {
                        removeElement(thinkingWrapper);
                    }
                    finalReply += delta.content;
                    streamUpdate(finalReply);
                }
                if (chunk.usage) {
                    tokenStats.promptTokens += chunk.usage.prompt_tokens || 0;
                    tokenStats.completionTokens += chunk.usage.completion_tokens || 0;
                    tokenStats.totalTokens += chunk.usage.total_tokens || 0;
                    tokenStats.cacheHitTokens += chunk.usage.prompt_cache_hit_tokens || 0;
                }
            }

            removeElement(thinkingWrapper);

            if (finalReply) finalRender(finalReply);
            tokenInfoText = tokenStats.getSummary();

            if (finalReply) {
                messageHistory.push({ role: 'assistant', content: finalReply });
                trimHistory(messageHistory, config.maxHistoryChars);
                // 保存完整对话（包含回复）
                saveHistoryToLocal();
            }

            if (is_debug && rawChunks.length > 0 && finalReply) {
                appendDebugInfo(rawChunks);
            }

            if (tokenInfoText) {
                const tokenDiv = document.createElement('div');
                tokenDiv.className = 'token-info';
                tokenDiv.style.cssText = 'font-size:10px;color:#999;margin-top:2px;margin-left:4px;';
                tokenDiv.textContent = tokenInfoText;
                const lastChild = messagesEl.lastElementChild;
                if (lastChild) {
                    lastChild.insertAdjacentElement('afterend', tokenDiv);
                }
            }

        } catch (err) {
            removeElement(thinkingWrapper);
            appendMessage('请求失败：' + err.message, 'bot');
            console.error('AI 请求错误:', err);
        }
    }

    // ==================== 初始化（恢复历史） ====================
    function init() {
        const hasHistory = loadHistoryFromLocal();
        if (hasHistory && messageHistory.length > 0) {
            // 还原消息到界面
            messageHistory.forEach(msg => {
                appendMessage(msg.content, msg.role);
            });
            // 如果有消息，隐藏占位（已由 appendMessage 自动隐藏）
            // 但是 appendMessage 是在循环中调用的，第一次调用就会隐藏占位，所以没问题。
        } else {
            // 无历史，确保占位显示
            showPlaceholder();
        }
    }

    // ==================== 事件绑定 ====================
    sendBtn.addEventListener('click', () => sendMessage(getInputValue()));
    promptEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(getInputValue()); });

    // ==================== 暴露 API ====================
    window.AiChat = {
        sendMessage,
        clearHistory,
        getHistory: () => messageHistory,
        getTokenStats: () => tokenStats,
        setEnabled: (enabled) => {
            // 允许外部动态开关（可选）
            // 但这里不直接修改 ENABLE_LOCAL_STORAGE，因为它是 const
            // 可改为 let，但为简单起见，不提供动态修改
            console.log('本地存储状态:', ENABLE_LOCAL_STORAGE ? '启用' : '禁用');
        }
    };

    // ==================== 启动 ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();