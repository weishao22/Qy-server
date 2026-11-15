// main.js: 负责加载更新日志并实现图片放大 (lightbox)

window.addEventListener('load', function () {
    loadChangelog();
});
if (document.readyState !== 'loading') {
    loadChangelog();
}

// 导航栏滚动效果（与之前页面一致）
window.addEventListener('scroll', function () {
    const menuBox = document.getElementById('menu-box');
    if (!menuBox) return;

    if (window.scrollY > 20) {
        menuBox.classList.add('scrolled')
        menuBox.style.boxShadow = "0px 2px 10px rgba(0,0,0,0.1)";
        menuBox.style.backdropFilter = "blur(10px)";
        menuBox.style.webkitBackdropFilter = "blur(10px)";
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => { link.style.color = "#5F5F5F"; });
        const logo = document.querySelector('.logo h2'); if (logo) logo.style.color = "#333";
    } else {
        menuBox.style.background = "none";
        menuBox.style.boxShadow = "none";
        menuBox.style.backdropFilter = "blur(10px)";
        menuBox.style.webkitBackdropFilter = "blur(10px)";
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => { link.style.color = "#C6CDD4"; });
        const logo = document.querySelector('.logo h2'); if (logo) logo.style.color = "#C6CDD4";
    }
});

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function loadChangelog() {
    fetch('/api/content/changelog_entry?t=' + Date.now())
        .then(res => res.json())
        .then(payload => {
            const data = (payload.items || []).map(it => {
                try { return JSON.parse(it.value || '{}'); } catch (e) { return {}; }
            }).filter(it => it && (it.date || it.title || it.content));
            const list = document.getElementById('changelog-list');
            if (!list) return;
            if (!data || !data.length) {
                list.innerHTML = '<p>暂无更新日志。</p>';
                return;
            }

            list.innerHTML = data.map(item => {
                let content = item.content
                content = typeof content === "string"
                    ? content
                    : content.join("\n");
                let html = content.replace(/\n/g, '<br>');

                return `
                    <div class="changelog-item">
                        <div class="changelog-date">${escHtml(item.date || '')}</div>
                        <div class="changelog-title">${escHtml(item.title || '')}</div>
                        <div class="changelog-content">${html}</div>
                    </div>`;
            }).join('');

            // 注入后绑定图片放大
            setupImageLightbox();
        })
        .catch(() => {
            const list = document.getElementById('changelog-list');
            if (list) list.innerHTML = '<p>无法加载更新日志。</p>';
        });
}

// Lightbox 功能
function ensureLightbox() {
    let lb = document.querySelector('.lightbox');
    if (lb) return lb;
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<span class="lightbox-close" aria-label="关闭">&times;</span><img class="lightbox-img" src="" alt="放大图">';
    document.body.appendChild(lb);

    lb.addEventListener('click', function (e) {
        if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLightbox();
    });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
    return lb;
}

function openLightbox(src) {
    const lb = ensureLightbox();
    const img = lb.querySelector('.lightbox-img');
    img.src = src;
    lb.classList.add('open');
}

function closeLightbox() {
    const lb = document.querySelector('.lightbox');
    if (!lb) return;
    lb.classList.remove('open');
    const img = lb.querySelector('.lightbox-img'); if (img) img.src = '';
}

function setupImageLightbox() {
    const imgs = document.querySelectorAll('#changelog-list .changelog-content img');
    imgs.forEach(img => {
        const parentLink = img.closest && img.closest('a');
        // 如果图片在链接中且该链接指向非图片资源（不同于 img.src），保留链接跳转并为其添加安全属性
        if (parentLink) {
            let linkHref = '';
            try { linkHref = new URL(parentLink.href, location.href).href; } catch (e) { linkHref = parentLink.href || ''; }
            let imgHref = '';
            try { imgHref = new URL(img.src, location.href).href; } catch (e) { imgHref = img.src || ''; }

            if (linkHref && imgHref && linkHref === imgHref) {
                // 链接指向图片本身：把点击行为改为打开 lightbox（用户期望预览而不是新标签）
                img.style.cursor = 'zoom-in';
                if (img.dataset.lightboxBound || img._lightboxBound) return;
                img.dataset.lightboxBound = '1';
                img._lightboxBound = true;
                // 阻止链接默认并优先打开 lightbox
                parentLink.addEventListener('click', function (e) {
                    e && e.preventDefault && e.preventDefault();
                    openLightbox(img.src);
                });
                img.addEventListener('click', function (e) {
                    e && e.preventDefault && e.preventDefault();
                    openLightbox(img.src);
                });
                return;
            }

            // 链接指向外部页面或资源（非图片），保留跳转并加安全属性
            try {
                if (!parentLink.target) parentLink.target = '_blank';
                if (!parentLink.rel) parentLink.rel = 'noopener';
            } catch (e) { }
            return;
        }

        // 普通未包裹链接的图片：绑定 lightbox
        img.style.cursor = 'zoom-in';
        if (img.dataset.lightboxBound || img._lightboxBound) return;
        img.dataset.lightboxBound = '1';
        img._lightboxBound = true;
        img.addEventListener('click', function (e) {
            e && e.preventDefault && e.preventDefault();
            openLightbox(img.src);
        });
    });
}

// 导出给调试控制台（可选）
window.__openLightbox = openLightbox;
