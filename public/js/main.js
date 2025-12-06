// スムーススクロール
document.addEventListener('DOMContentLoaded', function() {
    // すべてのアンカーリンクにスムーススクロールを適用
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // #のみの場合やhrefがない場合はスキップ
            if (!href || href === '#') return;
            
            e.preventDefault();
            
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    console.log('のなめビューティー - システム起動');
});
