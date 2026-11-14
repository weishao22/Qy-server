const fs = require('fs');
const p = 'lib/qy-nav.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
`    function dispatchReady() {
        try {
            document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
        } catch (e) {}
        setTimeout(function () {
            try {
                window.dispatchEvent(new Event('load'));
            } catch (e) {}
        }, 0);
    }

`,
''
);
s = s.split('            window.__twikoo_init_time = Date.now();\n').join('');
fs.writeFileSync(p, s);
console.log('cleaned', !s.includes('dispatchReady'), !s.includes('__twikoo_init_time'));
