'use strict';

const state = {
    pages: [],
    sources: [],
    entries: [],
    currentPage: null,
    currentSource: null,
    query: '',
    dirty: new Map(),
    stats: { overrides: 0 },
    saving: false
};

const el = (id) => document.getElementById(id);

const loginView = el('login-view');
const appView = el('app-view');
const loginForm = el('login-form');
const loginError = el('login-error');
const passwordModal = el('password-modal');

function showToast(message, kind = 'info') {
    const toast = el('toast');
    toast.textContent = message;
    toast.className = `toast ${kind}`;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.hidden = true;
    }, 2600);
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (response.status === 401 && !url.endsWith('/login') && !url.endsWith('/session')) {
        showApp(false);
        throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) {
        throw new Error((data && data.error) || `请求失败 (${response.status})`);
    }
    return data;
}

function showApp(authenticated) {
    loginView.hidden = authenticated;
    appView.hidden = !authenticated;
    if (authenticated) {
        loadPages();
        switchView('dashboard');
        loadComments();
    }
}

/* ---------------- 视图切换 ---------------- */
function switchView(name) {
    document.querySelectorAll('.tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.view === name);
    });
    document.querySelectorAll('.view').forEach((view) => {
        view.hidden = view.id !== `view-${name}`;
    });
    if (name === 'comments') loadComments();
    if (name === 'settings') loadSettings();
    if (name === 'dashboard' && window.QYDashboard) window.QYDashboard.init();
    if (name === 'content' && state.pages.length && !state.currentPage && !state.currentSource) {
        selectPage(state.pages[0].sitePath);
    }
    if (name === 'datacontent') {
        loadDbTypes();
    }
}

document.getElementById('tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (!tab) return;
    switchView(tab.dataset.view);
});

/* ---------------- 登录 ---------------- */
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = el('login-password').value;
    const submit = el('login-submit');
    loginError.hidden = true;
    submit.disabled = true;
    try {
        const result = await api('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        el('login-password').value = '';
        showApp(true);
        if (result.mustChange) {
            showToast('当前仍是默认密码，请尽快修改', 'error');
        }
    } catch (error) {
        loginError.textContent = error.message;
        loginError.hidden = false;
    } finally {
        submit.disabled = false;
    }
});

el('logout').addEventListener('click', async () => {
    if (state.dirty.size && !confirm('还有未保存的修改，确定退出？')) return;
    try {
        await api('/api/admin/logout', { method: 'POST' });
    } catch {
        /* ignore */
    }
    state.dirty.clear();
    location.reload();
});

/* ---------------- 修改密码 ---------------- */
el('open-password').addEventListener('click', () => {
    el('pw-error').hidden = true;
    el('pw-current').value = '';
    el('pw-next').value = '';
    el('pw-confirm').value = '';
    passwordModal.hidden = false;
    el('pw-current').focus();
});

el('pw-cancel').addEventListener('click', () => {
    passwordModal.hidden = true;
});

el('password-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = el('pw-current').value;
    const next = el('pw-next').value;
    const confirmValue = el('pw-confirm').value;
    const error = el('pw-error');
    error.hidden = true;
    if (next !== confirmValue) {
        error.textContent = '两次输入的新密码不一致';
        error.hidden = false;
        return;
    }
    try {
        await api('/api/admin/password', {
            method: 'POST',
            body: JSON.stringify({ current, next })
        });
        passwordModal.hidden = true;
        alert('密码已修改，请使用新密码重新登录。');
        location.reload();
    } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
    }
});

/* ---------------- 页面列表 ---------------- */
async function loadPages() {
    try {
        const data = await api('/api/admin/pages');
        state.pages = data.pages;
        state.sources = data.sources || [];
        state.stats = data.stats;
        renderPages();
        renderStats();
        if (state.pages.length && !state.currentPage && !state.currentSource && !el('view-content').hidden) {
            selectPage(state.pages[0].sitePath);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderStats() {
    el('stat-overrides').textContent = `${state.stats.overrides || 0} 处已修改`;
}

function pageLabel(sitePath) {
    if (sitePath === '/') return '首页 /';
    return sitePath;
}

function renderPages() {
    const nav = el('page-list');
    nav.textContent = '';
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'page-item';
    all.dataset.page = '';
    all.innerHTML = '<span class="label">全部页面文字</span>';
    if (!state.currentPage && !state.currentSource) all.classList.add('active');
    all.addEventListener('click', () => {
        state.currentSource = null;
        selectPage(null);
    });
    nav.appendChild(all);

    for (const page of state.pages) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'page-item';
        button.dataset.page = page.sitePath;
        if (!state.currentSource && state.currentPage === page.sitePath) button.classList.add('active');
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = pageLabel(page.sitePath);
        const count = document.createElement('span');
        count.className = 'count';
        count.textContent = page.count;
        button.append(label, count);
        button.addEventListener('click', () => selectPage(page.sitePath));
        nav.appendChild(button);
    }

    if (state.sources.length) {
        const divider = document.createElement('div');
        divider.className = 'sidebar-divider';
        divider.textContent = '数据与文档内容';
        nav.appendChild(divider);
        for (const source of state.sources) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'page-item';
            button.dataset.source = source.route;
            if (state.currentSource === source.route) button.classList.add('active');
            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = source.label;
            const count = document.createElement('span');
            count.className = 'count';
            count.textContent = source.count;
            button.append(label, count);
            button.title = source.file;
            button.addEventListener('click', () => selectSource(source.route));
            nav.appendChild(button);
        }
    }
}

function highlightPages() {
    document.querySelectorAll('.page-item').forEach((item) => {
        if (item.dataset.source) {
            item.classList.toggle('active', state.currentSource === item.dataset.source);
        } else {
            const value = item.dataset.page || null;
            item.classList.toggle('active', !state.currentSource && state.currentPage === value);
        }
    });
}

/* ---------------- 条目加载与渲染 ---------------- */
async function selectPage(sitePath) {
    state.currentPage = sitePath;
    state.currentSource = null;
    highlightPages();
    const preview = el('preview-link');
    const visual = el('visual-link');
    if (sitePath) {
        preview.hidden = false;
        preview.href = sitePath;
        visual.hidden = false;
        visual.href = `${sitePath}?edit=1`;
        el('page-title').textContent = pageLabel(sitePath);
        const page = state.pages.find((p) => p.sitePath === sitePath);
        el('page-meta').textContent = page
            ? `${page.count} 段文字 · 源文件 ${page.file}${page.hasBlocks ? ' · 已区块化（建议用“页面上直接改”）' : ''}`
            : '';
    } else {
        preview.hidden = true;
        visual.hidden = true;
        el('page-title').textContent = '全部页面文字';
        el('page-meta').textContent = '按页面分组浏览全站文字，修改后一次性保存';
    }
    await loadEntries();
}

async function selectSource(route) {
    state.currentSource = route;
    state.currentPage = null;
    highlightPages();
    const source = state.sources.find((item) => item.route === route);
    el('preview-link').hidden = false;
    el('preview-link').href = route;
    el('visual-link').hidden = true;
    el('page-title').textContent = source ? source.label : route;
    el('page-meta').textContent = source ? `${source.count} 条内容 · 源文件 ${source.file}` : '';
    await loadEntries();
}

async function loadEntries() {
    const params = new URLSearchParams();
    if (state.currentSource) params.set('source', state.currentSource);
    else if (state.currentPage) params.set('page', state.currentPage);
    if (state.query) params.set('q', state.query);
    try {
        const data = await api(`/api/admin/entries?${params.toString()}`);
        state.entries = data.entries;
        state.stats = data.stats;
        renderStats();
        renderEntries();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function entryId(entry) {
    return entry.id;
}

function renderEntries() {
    const container = el('entries');
    container.textContent = '';
    const empty = el('empty-state');
    if (!state.entries.length) {
        empty.hidden = false;
        empty.textContent = state.query ? '没有找到匹配的文字。' : '这个页面没有可编辑的文字。';
        return;
    }
    empty.hidden = true;

    let lastPage = null;
    const fragment = document.createDocumentFragment();

    for (const entry of state.entries) {
        const pageOfEntry = entry.pages && entry.pages[0] ? entry.pages[0] : '';
        if (!state.currentPage && !state.currentSource && pageOfEntry && pageOfEntry !== lastPage) {
            lastPage = pageOfEntry;
            const heading = document.createElement('div');
            heading.className = 'group-heading';
            heading.textContent = entry.type === 'text' || entry.type === 'attr'
                ? pageLabel(pageOfEntry)
                : (state.sources.find((s) => s.route === pageOfEntry) || {}).label || pageOfEntry;
            fragment.appendChild(heading);
        }
        fragment.appendChild(buildEntryCard(entry));
    }
    container.appendChild(fragment);
}

function buildEntryCard(entry) {
    const id = entryId(entry);
    const pending = state.dirty.get(id);
    const value = pending ? pending.value : entry.value;

    const card = document.createElement('div');
    card.className = 'entry';
    card.dataset.id = id;
    if (entry.overridden) card.classList.add('modified');
    if (pending) card.classList.add('dirty');

    const head = document.createElement('div');
    head.className = 'entry-head';

    const tag = document.createElement('span');
    tag.className = 'badge tag';
    tag.textContent = entry.tag;
    head.appendChild(tag);

    if (entry.shared) {
        const shared = document.createElement('span');
        shared.className = 'badge shared';
        shared.title = entry.pages.join('\n');
        shared.textContent = `共享于 ${entry.pages.length} 个页面`;
        head.appendChild(shared);
    }
    if (entry.stale) {
        const stale = document.createElement('span');
        stale.className = 'badge stale';
        stale.textContent = '源文字已变更';
        head.appendChild(stale);
    }
    if (pending) {
        const badge = document.createElement('span');
        badge.className = 'badge pending';
        badge.textContent = '未保存';
        head.appendChild(badge);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.rows = Math.min(6, Math.max(2, Math.ceil(value.length / 52)));
    textarea.addEventListener('input', () => {
        const next = textarea.value;
        const original = entry.value;
        if (next === original) {
            state.dirty.delete(id);
        } else {
            state.dirty.set(id, {
                key: entry.key,
                source: entry.source,
                value: next,
                pages: entry.pages,
                force: Boolean(pending && pending.force)
            });
        }
        card.classList.toggle('dirty', state.dirty.has(id));
        updateSaveBar();
        const badge = card.querySelector('.badge.pending');
        if (state.dirty.has(id) && !badge) {
            const created = document.createElement('span');
            created.className = 'badge pending';
            created.textContent = '未保存';
            head.appendChild(created);
        } else if (!state.dirty.has(id) && badge) {
            badge.remove();
        }
    });

    const foot = document.createElement('div');
    foot.className = 'entry-foot';

    const orig = document.createElement('span');
    orig.className = 'orig';
    if (entry.overridden && entry.source !== entry.value) {
        orig.textContent = `原文：${entry.source}`;
    } else if (entry.stale) {
        orig.textContent = `旧记录：${entry.stored}`;
    } else {
        orig.textContent = '';
    }
    foot.appendChild(orig);

    const actions = document.createElement('span');
    actions.style.display = 'flex';
    actions.style.gap = '12px';

    if (entry.stale) {
        const force = document.createElement('button');
        force.type = 'button';
        force.className = 'link-btn';
        force.textContent = '强制沿用已保存内容';
        force.addEventListener('click', () => {
            state.dirty.set(id, {
                key: entry.key,
                source: entry.source,
                value: entry.stored,
                pages: entry.pages,
                force: true
            });
            textarea.value = entry.stored;
            card.classList.add('dirty');
            updateSaveBar();
        });
        actions.appendChild(force);
    }

    if (entry.overridden) {
        const revert = document.createElement('button');
        revert.type = 'button';
        revert.className = 'link-btn muted';
        revert.textContent = '恢复原文';
        revert.addEventListener('click', async () => {
            state.dirty.set(id, {
                key: entry.key,
                source: entry.source,
                value: null,
                pages: entry.pages,
                force: false
            });
            textarea.value = entry.source;
            card.classList.add('dirty');
            updateSaveBar();
        });
        actions.appendChild(revert);
    }

    foot.appendChild(actions);

    card.append(head, textarea, foot);
    return card;
}

/* ---------------- 保存 ---------------- */
function updateSaveBar() {
    const bar = el('savebar');
    if (!state.dirty.size) {
        bar.hidden = true;
        return;
    }
    bar.hidden = false;
    el('savebar-text').textContent = `有 ${state.dirty.size} 处未保存的修改`;
}

el('discard-all').addEventListener('click', () => {
    if (!confirm('确定放弃所有未保存的修改？')) return;
    state.dirty.clear();
    renderEntries();
    updateSaveBar();
});

el('save-all').addEventListener('click', async () => {
    if (state.saving || !state.dirty.size) return;
    state.saving = true;
    const button = el('save-all');
    button.disabled = true;
    const changes = Array.from(state.dirty.values()).map((item) => ({
        key: item.key,
        source: item.source,
        value: item.value,
        pages: item.pages,
        force: item.force
    }));
    try {
        const result = await api('/api/admin/save', {
            method: 'POST',
            body: JSON.stringify({ changes })
        });
        state.dirty.clear();
        showToast(`已保存：更新 ${result.updated} 处，恢复 ${result.removed} 处`, 'ok');
        await loadEntries();
        await loadPages();
        updateSaveBar();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        state.saving = false;
        button.disabled = false;
    }
});

/* ---------------- 导入静态页面到区块库 ---------------- */
const migrateStaticBtn = el('migrate-static');
if (migrateStaticBtn) {
    migrateStaticBtn.addEventListener('click', async () => {
        if (!confirm('把所有尚未区块化的静态页面导入数据库？已有区块的页面会跳过。')) return;
        migrateStaticBtn.disabled = true;
        try {
            const result = await api('/api/admin/layout/migrate', {
                method: 'POST',
                body: JSON.stringify({ force: false })
            });
            showToast(`已处理 ${result.count} 个页面`, 'ok');
            await loadPages();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            migrateStaticBtn.disabled = false;
        }
    });
}

/* ---------------- 搜索 ---------------- */
let searchTimer = null;
el('search-input').addEventListener('input', (event) => {
    const value = event.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.query = value;
        if (value) {
            state.currentPage = null;
            state.currentSource = null;
            highlightPages();
            el('page-title').textContent = `搜索：${value}`;
            el('page-meta').textContent = '匹配到的全站文字（含数据与文档）';
            el('preview-link').hidden = true;
            el('visual-link').hidden = true;
        } else if (!state.currentPage && !state.currentSource) {
            el('page-title').textContent = '全部页面文字';
        }
        loadEntries();
    }, 260);
});

window.addEventListener('beforeunload', (event) => {
    if (state.dirty.size) {
        event.preventDefault();
        event.returnValue = '';
    }
});

/* ---------------- 启动 ---------------- */
(async () => {
    try {
        const session = await api('/api/admin/session');
        showApp(session.authenticated);
    } catch {
        showApp(false);
    }
})();
'use strict';

function fmtTime(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => (n < 10 ? '0' + n : String(n));
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/* ---------------- 评论管理 ---------------- */
async function loadComments() {
    const filter = el('comment-filter').value.trim();
    const params = new URLSearchParams();
    if (filter) params.set('path', filter);
    try {
        const data = await api(`/api/admin/comments?${params.toString()}`);
        renderComments(data.comments || []);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function renderComments(rows) {
    const list = el('comment-list');
    list.textContent = '';
    if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '暂无评论';
        list.appendChild(empty);
        return;
    }
    rows.forEach((row) => {
        const card = document.createElement('div');
        card.className = 'comment-card';
        const head = document.createElement('div');
        head.className = 'comment-card-head';
        const nick = document.createElement('strong');
        nick.textContent = row.nick || '匿名玩家';
        const meta = document.createElement('span');
        meta.className = 'comment-meta';
        meta.textContent = `${fmtTime(row.createdAt)} · ${row.path}${row.email ? ' · ' + row.email : ''}`;
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'link-btn danger';
        del.textContent = '删除';
        del.addEventListener('click', async () => {
            if (!confirm('确定删除这条评论？')) return;
            try {
                await api(`/api/admin/comments/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
                showToast('已删除');
                loadComments();
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
        head.append(nick, meta, del);
        const body = document.createElement('p');
        body.className = 'comment-text';
        body.textContent = row.content || '';
        card.append(head, body);
        list.appendChild(card);
    });
}

el('comment-refresh').addEventListener('click', loadComments);
el('comment-filter').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadComments();
});

const commentProviderForm = document.getElementById('comment-provider-form');
if (commentProviderForm) {
    commentProviderForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await api('/api/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    comments: {
                        mode: 'thirdparty',
                        provider: commentProviderForm.provider.value === 'waline' ? 'waline' : 'twikoo',
                        serverUrl: commentProviderForm.serverUrl.value.trim(),
                        scriptUrl: commentProviderForm.scriptUrl.value.trim()
                    }
                })
            });
            showToast('已切换第三方评论服务', 'ok');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

/* ---------------- 设置 ---------------- */
function linesToLinks(text) {
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const parts = line.split('|').map((item) => item.trim());
        const typeRaw = (parts[3] || '').toLowerCase();
        const type = (typeRaw === 'java' || typeRaw === 'bedrock') ? typeRaw : '';
        let name = parts[0] || '';
        let host = parts[0] || '';
        let portRaw = 0;
        if (parts.length >= 3) {
            name = parts[0];
            host = parts[1];
            portRaw = Number(parts[2]);
        } else if (parts.length === 2) {
            name = parts[0];
            host = parts[1];
        }
        const defaultPort = type === 'java' || (!type && /java/i.test(host)) ? 25565 : 19132;
        return { name, host, port: portRaw > 0 ? portRaw : defaultPort, srv: true, type };
    });
}

function linksToLines(list) {
    return (list || []).map((item) => {
        const base = `${item.name || item.host}|${item.host}|${item.port}`;
        return item.type ? `${base}|${item.type}` : base;
    }).join('\n');
}

async function loadSettings() {
    try {
        const data = await api('/api/admin/settings');
        const mc = document.getElementById('settings-mc');
        mc.host.value = data.mc.host || '';
        mc.port.value = data.mc.port || '';
        mc.srv.checked = data.mc.srv !== false;
        mc.recordCronMinutes.value = data.mc.recordCronMinutes || 2;
        mc.extraServers.value = linksToLines(data.mc.extraServers);

        const dm = document.getElementById('settings-danmaku');
        dm.maxTextLength.value = data.danmaku.maxTextLength;
        dm.cooldownMs.value = data.danmaku.cooldownMs;
        dm.rateWindowMs.value = data.danmaku.rateWindowMs;
        dm.rateWindowLimit.value = data.danmaku.rateWindowLimit;
        dm.bannedWords.value = (data.danmaku.bannedWords || []).join('\n');

        const cm = document.getElementById('settings-comments');
        cm.mode.value = data.comments.mode || 'thirdparty';
        cm.provider.value = data.comments.provider || 'twikoo';
        cm.serverUrl.value = data.comments.serverUrl || '';
        cm.scriptUrl.value = data.comments.scriptUrl || '';
        cm.enabled.checked = data.comments.enabled !== false;
        cm.requireEmail.checked = Boolean(data.comments.requireEmail);
        cm.cooldownMs.value = data.comments.cooldownMs;
        cm.maxLength.value = data.comments.maxLength;
        cm.maxNick.value = data.comments.maxNick;

        const providerForm = document.getElementById('comment-provider-form');
        if (providerForm) {
            providerForm.provider.value = data.comments.provider || 'twikoo';
            providerForm.serverUrl.value = data.comments.serverUrl || '';
            providerForm.scriptUrl.value = data.comments.scriptUrl || '';
        }

        const vw = document.getElementById('settings-views');
        vw.cooldownMs.value = data.views.cooldownMs;
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function saveSettings() {
    const mc = document.getElementById('settings-mc');
    const dm = document.getElementById('settings-danmaku');
    const cm = document.getElementById('settings-comments');
    const vw = document.getElementById('settings-views');
    const payload = {
        mc: {
            host: mc.host.value.trim(),
            port: Number(mc.port.value) || 41657,
            srv: mc.srv.checked,
            recordCronMinutes: Number(mc.recordCronMinutes.value) || 2,
            extraServers: linesToLinks(mc.extraServers.value)
        },
        danmaku: {
            maxTextLength: Number(dm.maxTextLength.value) || 80,
            cooldownMs: Number(dm.cooldownMs.value) || 0,
            rateWindowMs: Number(dm.rateWindowMs.value) || 10000,
            rateWindowLimit: Number(dm.rateWindowLimit.value) || 8,
            bannedWords: dm.bannedWords.value.split(/\r?\n/).map((word) => word.trim()).filter(Boolean)
        },
        comments: {
            mode: cm.mode.value === 'local' ? 'local' : 'thirdparty',
            provider: cm.provider.value === 'waline' ? 'waline' : 'twikoo',
            serverUrl: cm.serverUrl.value.trim(),
            scriptUrl: cm.scriptUrl.value.trim(),
            enabled: cm.enabled.checked,
            requireEmail: cm.requireEmail.checked,
            cooldownMs: Number(cm.cooldownMs.value) || 0,
            maxLength: Number(cm.maxLength.value) || 600,
            maxNick: Number(cm.maxNick.value) || 24
        },
        views: {
            cooldownMs: Number(vw.cooldownMs.value) || 0
        }
    };
    try {
        await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
        showToast('设置已保存', 'ok');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

el('settings-save')?.addEventListener('click', saveSettings);

/* ---------------- 内容库（数据库内容管理） ---------------- */

const dbState = {
    currentType: null,
    currentItem: null,
    currentParsed: {},
    items: []
};

const DB_TYPE_LABELS = {
    gallery_image: '图廊图片',
    changelog_entry: '更新日志',
    timeline_entry: '发展历程',
    nav_item: '网站导航',
    command: '服务器指令',
    popup_announcement: '弹窗公告',
    faq_item: 'FAQ 问题',
    faq_content: 'FAQ 内容'
};

async function loadDbTypes() {
    // 始终展示所有已知内容类型，即使数据库为空也能新建
    const dbTypes = Object.keys(DB_TYPE_LABELS);
    renderDbTypes(dbTypes);
    if (dbTypes.length) {
        selectDbType(dbTypes[0]);
    }
}

function renderDbTypes(types) {
    const container = el('db-type-list');
    container.innerHTML = '';
    types.forEach((type) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-item' + (dbState.currentType === type ? ' active' : '');
        btn.textContent = DB_TYPE_LABELS[type] || type;
        btn.dataset.type = type;
        btn.addEventListener('click', () => selectDbType(type));
        container.appendChild(btn);
    });
}

function selectDbType(type) {
    dbState.currentType = type;
    dbState.currentItem = null;
    el('db-form-wrap').hidden = true;
    el('db-empty').hidden = true;
    document.querySelectorAll('#db-type-list .page-item').forEach((b) => {
        b.classList.toggle('active', b.dataset.type === type);
    });
    loadDbItems(type);
}

async function loadDbItems(type) {
    dbState.currentType = type;
    try {
        const data = await api(`/api/content/${type}?t=${Date.now()}`);
        const items = (data.items || []).map((r) => {
            try {
                const parsed = JSON.parse(r.value || '{}');
                return { ...r, parsed };
            } catch {
                return { ...r, parsed: {} };
            }
        });
        dbState.items = items;
        renderDbItems(items);
    } catch (error) {
        dbState.items = [];
        renderDbItems([]);
        showToast('加载内容列表失败：' + error.message, 'error');
    }
}

function renderDbItems(items) {
    const container = el('db-list');
    const empty = el('db-empty');
    const title = el('db-list-title');
    const meta = el('db-list-meta');

    title.textContent = DB_TYPE_LABELS[dbState.currentType] || dbState.currentType;
    meta.textContent = `共 ${items.length} 条`;

    if (!items || !items.length) {
        container.innerHTML = '';
        empty.hidden = false;
        return;
    }
    empty.hidden = true;
    container.innerHTML = '';
    items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'page-item db-row';
        row.dataset.id = item.id;
        const preview = (() => {
            try {
                const p = item.parsed || {};
                if (p.title) return p.title;
                if (p.name) return p.name;
                if (p.text) return p.text.slice(0, 30);
                return String(item.value || '').slice(0, 30);
            } catch {
                return String(item.value || '').slice(0, 30);
            }
        })();
        row.innerHTML = `
            <div class="db-row-main">${escapeHtml(preview)}</div>
            <div class="db-row-meta">${escapeHtml(item.key || '')} · ${new Date(item.updatedAt * 1000).toLocaleString()}</div>
        `;
        row.addEventListener('click', () => selectDbItem(item));
        container.appendChild(row);
    });
}

/* 各内容类型的专用表单字段定义 */
const DB_SCHEMAS = {
    gallery_image: [
        { key: 'title', label: '标题', type: 'text' },
        { key: 'imageUrl', label: '原图 URL', type: 'url' },
        { key: 'thumbnailUrl', label: '缩略图 URL（留空则用原图）', type: 'url' },
        { key: 'date', label: '日期', type: 'text' },
        { key: 'location', label: '地点', type: 'text' },
        { key: 'author', label: '作者', type: 'text' },
        { key: 'description', label: '描述', type: 'text' }
    ],
    changelog_entry: [
        { key: 'date', label: '日期', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'content', label: '内容（每行一条）', type: 'textarea', rows: 6 }
    ],
    timeline_entry: [
        { key: 'date', label: '日期', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'description', label: '描述', type: 'textarea', rows: 4 }
    ],
    nav_item: [
        { key: 'title', label: '名称', type: 'text' },
        { key: 'url', label: '链接', type: 'text' },
        { key: 'description', label: '描述', type: 'text' },
        { key: 'icon', label: '图标（如 fas fa-link）', type: 'text' }
    ],
    command: [
        { key: 'name', label: '指令', type: 'text' },
        { key: 'description', label: '描述', type: 'text' },
        { key: 'usage', label: '用法', type: 'textarea', rows: 3 },
        { key: 'icon', label: '图标（如 fa-terminal）', type: 'text' }
    ],
    popup_announcement: [
        { key: 'popupVersion', label: '公告版本号（改数字可让所有人重新看到弹窗）', type: 'text' },
        { key: 'title', label: '标题', type: 'text' },
        { key: 'buttonText', label: '按钮文字', type: 'text' },
        { key: 'content', label: '内容（HTML，每段一行）', type: 'textarea', rows: 12 }
    ],
    faq_item: [
        { key: 'id', label: '编号（如 001）', type: 'text' },
        { key: 'title', label: '问题', type: 'text' },
        { key: 'summary', label: '摘要', type: 'textarea', rows: 2 },
        { key: 'tags', label: '标签（逗号分隔）', type: 'text' }
    ],
    faq_content: [
        { key: 'title', label: '标题', type: 'text' },
        { key: 'content', label: 'Markdown 内容', type: 'textarea', rows: 10 }
    ]
};

function renderDbFields(type, data) {
    const box = el('db-fields');
    if (!box) return;
    box.innerHTML = '';
    const schema = DB_SCHEMAS[type] || [{ key: 'content', label: '内容（JSON）', type: 'textarea', rows: 8 }];
    schema.forEach((field) => {
        const wrap = document.createElement('label');
        wrap.className = 'field';
        const span = document.createElement('span');
        span.textContent = field.label;
        wrap.appendChild(span);
        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = field.rows || 4;
        } else {
            input = document.createElement('input');
            input.type = 'text';
        }
        let val = data ? data[field.key] : '';
        if (Array.isArray(val)) val = val.join('\n');
        input.value = val == null ? '' : String(val);
        input.dataset.field = field.key;
        wrap.appendChild(input);
        box.appendChild(wrap);
    });
}

function collectDbValues() {
    const box = el('db-fields');
    const out = {};
    if (!box) return out;
    box.querySelectorAll('input[data-field], textarea[data-field]').forEach((input) => {
        const key = input.dataset.field;
        let val = input.value;
        if (key === 'tags') {
            out[key] = val.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
        } else if (key === 'content') {
            out[key] = val;
        } else {
            out[key] = val.trim();
        }
    });
    return out;
}

function selectDbItem(item) {
    dbState.currentItem = item;
    document.querySelectorAll('#db-list .db-row').forEach((r) => {
        r.classList.toggle('active', r.dataset.id == item.id);
    });

    let parsed = {};
    try { parsed = JSON.parse(item.value || '{}'); } catch { parsed = {}; }
    dbState.currentParsed = parsed;

    el('db-id').value = item.id;
    el('db-type').value = item.type;
    el('db-key').value = item.key || '';
    el('db-sortOrder').value = item.sortOrder || 0;
    renderDbFields(item.type, parsed);
    const delBtn = el('db-delete');
    if (delBtn) delBtn.hidden = false;

    el('db-form-title').textContent = '编辑：' + (parsed.title || parsed.name || item.key || '未命名');
    el('db-form-meta').textContent = 'ID：' + item.id + ' · 类型：' + item.type;
    el('db-form-wrap').hidden = false;
}

function newDbItem() {
    if (!dbState.currentType) {
        showToast('请先选择内容类型', 'error');
        return;
    }
    dbState.currentItem = null;
    dbState.currentParsed = {};
    el('db-id').value = '';
    el('db-type').value = dbState.currentType;
    el('db-key').value = '';
    el('db-sortOrder').value = 0;
    renderDbFields(dbState.currentType, {});

    el('db-form-title').textContent = '新建：' + (DB_TYPE_LABELS[dbState.currentType] || dbState.currentType);
    el('db-form-meta').textContent = '类型：' + dbState.currentType;
    el('db-delete').hidden = true;
    el('db-form-wrap').hidden = false;

    document.querySelectorAll('#db-list .db-row').forEach((r) => r.classList.remove('active'));
}

function saveDbItem() {
    const id = el('db-id').value || undefined;
    const type = el('db-type').value.trim();
    let key = el('db-key').value.trim();
    const sortOrder = Number(el('db-sortOrder').value) || 0;
    const values = collectDbValues();

    if (!type) {
        showToast('类型不能为空', 'error');
        return;
    }

    const merged = Object.assign({}, dbState.currentParsed || {}, values);
    if (type === 'faq_item' && merged.id) {
        key = merged.id;
    }
    if (!key) {
        key = type + '-' + Date.now();
    }

    const title = merged.title || merged.name || '';
    const description = merged.summary || merged.description || '';
    const value = JSON.stringify(merged);

    const payload = { type, key, title, description, value, route: '', sortOrder };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/content/${id}` : '/api/admin/content';

    api(url, { method, body: JSON.stringify(payload) })
        .then(() => {
            showToast(id ? '内容已更新' : '内容已新建', 'ok');
            el('db-form-wrap').hidden = true;
            loadDbItems(dbState.currentType);
        })
        .catch((error) => showToast('保存失败：' + error.message, 'error'));
}

function deleteDbItem() {
    if (!dbState.currentItem) return;
    if (!confirm('确定要删除此条内容吗？')) return;
    api(`/api/admin/content/${dbState.currentItem.id}`, { method: 'DELETE' })
        .then(() => {
            showToast('内容已删除', 'ok');
            el('db-form-wrap').hidden = true;
            dbState.currentItem = null;
            loadDbItems(dbState.currentType);
        })
        .catch((error) => showToast('删除失败：' + error.message, 'error'));
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

el('db-new')?.addEventListener('click', newDbItem);
el('db-refresh')?.addEventListener('click', () => loadDbItems(dbState.currentType));
el('db-cancel')?.addEventListener('click', () => { 
    const wrap = el('db-form-wrap'); 
    if (wrap) wrap.hidden = true; 
    dbState.currentItem = null; 
});
el('db-save')?.addEventListener('click', saveDbItem);
el('db-delete')?.addEventListener('click', deleteDbItem);

window.AdminApp = { api, showToast, el, state, switchView };
