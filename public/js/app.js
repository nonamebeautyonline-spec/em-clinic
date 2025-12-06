// ========================================
// ユーティリティ関数
// ========================================

/**
 * トーストメッセージを表示
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * セクションへスムーズスクロール
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * 日付フォーマット
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

/**
 * BMI計算
 */
function calculateBMI(weight, height) {
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
}

// ========================================
// ナビゲーション
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // ナビゲーションリンクのアクティブ状態管理
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');
    
    function updateActiveNav() {
        let currentSection = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 100) {
                currentSection = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNav);
    
    // スムーズスクロール
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
});

// ========================================
// FAQ アコーディオン
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // 現在のアイテムのアクティブ状態をトグル
            const isActive = item.classList.contains('active');
            
            // 同じカテゴリ内の他のFAQを閉じる
            const parent = item.closest('.faq-category');
            parent.querySelectorAll('.faq-item').forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // クリックされたアイテムを開く（すでに開いていない場合）
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});

// ========================================
// 診療予約フォーム
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const reservationForm = document.getElementById('reservation-form');
    
    if (reservationForm) {
        // 今日の日付を最小値として設定
        const today = new Date().toISOString().split('T')[0];
        const reservationDateInput = document.getElementById('reservation-date');
        const birthdayInput = document.getElementById('birthday');
        
        if (reservationDateInput) {
            reservationDateInput.min = today;
        }
        
        if (birthdayInput) {
            // 生年月日は100年前から18年前まで
            const maxDate = new Date();
            maxDate.setFullYear(maxDate.getFullYear() - 18);
            birthdayInput.max = maxDate.toISOString().split('T')[0];
            
            const minDate = new Date();
            minDate.setFullYear(minDate.getFullYear() - 100);
            birthdayInput.min = minDate.toISOString().split('T')[0];
        }
        
        // BMI自動計算と表示
        const weightInput = document.getElementById('weight');
        const heightInput = document.getElementById('height');
        
        function updateBMI() {
            if (weightInput.value && heightInput.value) {
                const bmi = calculateBMI(parseFloat(weightInput.value), parseFloat(heightInput.value));
                console.log('BMI:', bmi);
                // BMIに基づいた推奨メッセージを表示することも可能
            }
        }
        
        if (weightInput) weightInput.addEventListener('input', updateBMI);
        if (heightInput) heightInput.addEventListener('input', updateBMI);
        
        // フォーム送信処理
        reservationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // フォームデータを取得
            const formData = {
                name: document.getElementById('name').value,
                nameKana: document.getElementById('name-kana').value,
                birthday: document.getElementById('birthday').value,
                gender: document.getElementById('gender').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                weight: parseFloat(document.getElementById('weight').value),
                height: parseFloat(document.getElementById('height').value),
                medicine: document.getElementById('medicine').value,
                reservationDate: document.getElementById('reservation-date').value,
                reservationTime: document.getElementById('reservation-time').value,
                medicalHistory: document.getElementById('medical-history').value,
                notes: document.getElementById('notes').value,
                bmi: calculateBMI(
                    parseFloat(document.getElementById('weight').value),
                    parseFloat(document.getElementById('height').value)
                ),
                createdAt: new Date().toISOString()
            };
            
            try {
                // データベースに保存
                const response = await fetch('tables/reservations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    showToast('診療予約が完了しました。確認メールをお送りしますので、ご確認ください。', 'success');
                    reservationForm.reset();
                    
                    // 予約完了後、トップにスクロール
                    setTimeout(() => {
                        scrollToSection('home');
                    }, 2000);
                } else {
                    throw new Error('予約の登録に失敗しました');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('予約の送信に失敗しました。もう一度お試しください。', 'error');
            }
        });
    }
});

// ========================================
// 薬剤選択の価格表示
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const medicineSelect = document.getElementById('medicine');
    
    if (medicineSelect) {
        medicineSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            console.log('選択された薬剤:', selectedValue);
            
            // 選択に応じた追加情報を表示することも可能
            const medicineInfo = {
                'mounjaro-2.5': {
                    name: 'マンジャロ 2.5mg',
                    price: 9800,
                    description: '導入期・低用量に適しています'
                },
                'mounjaro-5': {
                    name: 'マンジャロ 5mg',
                    price: 19800,
                    description: '標準用量で、多くの方に処方されています'
                },
                'mounjaro-7.5': {
                    name: 'マンジャロ 7.5mg',
                    price: 24800,
                    description: '高用量で、より高い効果が期待できます'
                },
                'mounjaro-10-15': {
                    name: 'マンジャロ 10mg/15mg',
                    price: 29800,
                    description: '最大用量です'
                }
            };
            
            if (medicineInfo[selectedValue]) {
                console.log('薬剤情報:', medicineInfo[selectedValue]);
            }
        });
    }
});

// ========================================
// お問い合わせ機能（将来的な拡張用）
// ========================================

// 問い合わせフォームの処理
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value,
                createdAt: new Date().toISOString()
            };
            
            try {
                const response = await fetch('tables/contacts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    showToast('お問い合わせを受け付けました。担当者より折り返しご連絡いたします。', 'success');
                    contactForm.reset();
                } else {
                    throw new Error('送信に失敗しました');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('送信に失敗しました。もう一度お試しください。', 'error');
            }
        });
    }
}

// ========================================
// ページ読み込み時の初期化
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('メディカルダイエットクリニック - システム起動');
    
    // アニメーション効果の追加
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // 観察対象の要素を設定
    const animateElements = document.querySelectorAll('.feature-card, .about-card, .price-card, .flow-step, .faq-category');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // スクロール時のヘッダー背景変更
    let lastScrollTop = 0;
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        }
        
        lastScrollTop = scrollTop;
    });
});

// ========================================
// グローバル関数のエクスポート
// ========================================

// scrollToSection関数をグローバルに公開
window.scrollToSection = scrollToSection;