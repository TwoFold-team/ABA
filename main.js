/* ===========================================================
   ABA PREMIUM LANDING PAGE — Main JavaScript
   Features:
   • Hero cinematic lock (5s scroll freeze + progress bar)
   • Two-phase hero reveal with staggered animations
   • Loan calculator with live range sync
   • Testimonials slider (autoplay + swipe + arrows)
   • Form validation → WhatsApp deep link handoff
   • Intersection Observer scroll reveals
   • Taskbar scroll behavior + mobile drawer
   =========================================================== */

(function () {
    'use strict';

    // ===== CONFIG =====
    const WA_NUMBER = '201107199771';
    const LOCK_DURATION_MS = 5000;       // 5 seconds of locked scrolling
    const PHASE1_TOTAL_MS  = 6200;       // Total time before phase 2 enters
    const ANNUAL_RATE      = 0.15;       // Estimated annual interest rate

    // ===== HELPERS =====
    const $  = (s, ctx = document) => ctx.querySelector(s);
    const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
    const fmt = n => Math.round(n).toLocaleString('en-US');

    // ===== STATE =====
    let selectedMonths = 12;
    let loanAmount = 150000;


    /* ---------------------------------------------------------
       1. HERO CINEMATIC LOCK + PHASE TRANSITIONS
       --------------------------------------------------------- */
    function initHeroSequence() {
        const body       = document.body;
        const taskbar    = $('#taskbar');
        const phase1     = $('#heroPhase1');
        const phase2     = $('#heroPhase2');
        const scrollCue  = $('#scrollCue');

        // Lock scroll + hide taskbar initially
        body.classList.add('scroll-locked');
        if (taskbar) taskbar.classList.add('locked');

        // Animate the progress bar over LOCK_DURATION
        const progressBar = $('#phase1ProgressBar');
        if (progressBar) {
            progressBar.style.transition = `width ${LOCK_DURATION_MS}ms linear`;
            // Force reflow then set width
            void progressBar.offsetWidth;
            requestAnimationFrame(() => { progressBar.style.width = '100%'; });
        }

        // After 5 seconds: unlock scroll + show taskbar
        setTimeout(() => {
            body.classList.remove('scroll-locked');
            if (taskbar) taskbar.classList.remove('locked');
        }, LOCK_DURATION_MS);

        // After ~6.2 seconds: fade out phase 1, enter phase 2
        setTimeout(() => {
            if (phase1) phase1.classList.add('exit');

            setTimeout(() => {
                if (phase2) phase2.classList.add('enter');
                if (scrollCue) scrollCue.classList.add('show');

                // Kick off metric counters after they become visible
                setTimeout(startMetricCounters, 900);
            }, 600); // wait for phase1 exit transition
        }, PHASE1_TOTAL_MS);
    }

    function startMetricCounters() {
        $$('.metric-val[data-count]').forEach(el => {
            const target = parseInt(el.dataset.count, 10);
            const duration = 1600;
            const start = performance.now();

            function tick(now) {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
                el.textContent = fmt(target * eased);
                if (t < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });
    }


    /* ---------------------------------------------------------
       2. TASKBAR — Scroll effect + hamburger/drawer
       --------------------------------------------------------- */
    function initTaskbar() {
        const taskbar = $('#taskbar');
        const burger  = $('#taskbarHamburger');
        const drawer  = $('#mobileDrawer');
        const overlay = $('#drawerOverlay');
        const closeBtn = $('#drawerClose');

        const onScroll = () => {
            if (!taskbar) return;
            taskbar.classList.toggle('scrolled', window.scrollY > 80);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        const openDrawer  = () => { drawer?.classList.add('open');    burger?.classList.add('active'); };
        const closeDrawer = () => { drawer?.classList.remove('open'); burger?.classList.remove('active'); };

        burger?.addEventListener('click', () => {
            drawer?.classList.contains('open') ? closeDrawer() : openDrawer();
        });
        overlay?.addEventListener('click', closeDrawer);
        closeBtn?.addEventListener('click', closeDrawer);

        // Close drawer when clicking any internal link
        $$('.drawer-links a').forEach(a => a.addEventListener('click', closeDrawer));
    }


    /* ---------------------------------------------------------
       3. LOAN CALCULATOR
       --------------------------------------------------------- */
    function initCalculator() {
        const range    = $('#loanRange');
        const display  = $('#loanDisplay');
        const chips    = $$('#termChips .chip');
        const instVal  = $('#instValue');
        const totalVal = $('#totalValue');
        const countVal = $('#countValue');

        if (!range || !display) return;

        function updateFill() {
            const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
            range.style.setProperty('--fill-pct', pct + '%');
        }

        function compute() {
            const principal = parseFloat(range.value) || 0;
            const r = ANNUAL_RATE / 12;
            const n = selectedMonths;
            let monthly;
            if (r === 0) monthly = principal / n;
            else monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

            const total = monthly * n;

            animateNumber(instVal, monthly);
            totalVal.textContent = fmt(total) + ' ج.م';
            countVal.textContent = n + ' قسط';
            display.textContent = fmt(principal);
            loanAmount = principal;
        }

        function animateNumber(el, newVal) {
            const cur = parseFloat((el.textContent || '0').replace(/,/g, '')) || 0;
            const diff = newVal - cur;
            const dur = 400;
            const t0 = performance.now();
            function step(now) {
                const t = Math.min((now - t0) / dur, 1);
                const e = 1 - Math.pow(1 - t, 3);
                el.textContent = fmt(cur + diff * e);
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        range.addEventListener('input', () => { updateFill(); compute(); });

        chips.forEach(chip => chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedMonths = parseInt(chip.dataset.months, 10);
            compute();
        }));

        updateFill();
        compute();
    }


    /* ---------------------------------------------------------
       4. TESTIMONIALS SLIDER
       --------------------------------------------------------- */
    function initTestimonialSlider() {
        const track   = $('#tstTrack');
        const dotsBox = $('#tstDots');
        const prevBtn = $('#tstPrev');
        const nextBtn = $('#tstNext');
        if (!track || !dotsBox) return;

        const slides = [...track.children];
        const N = slides.length;
        let idx = 0;
        let timer;

        // Build dots
        for (let i = 0; i < N; i++) {
            const d = document.createElement('button');
            d.className = 'tdot' + (i === 0 ? ' active' : '');
            d.setAttribute('aria-label', `شريحة ${i + 1}`);
            d.addEventListener('click', () => go(i));
            dotsBox.appendChild(d);
        }
        const dots = $$('.tdot', dotsBox);

        function go(i) {
            idx = ((i % N) + N) % N;
            // RTL container → use positive percentage to shift right-to-left visually
            track.style.transform = `translateX(${idx * 100}%)`;
            dots.forEach((d, k) => d.classList.toggle('active', k === idx));
            restart();
        }
        function next() { go(idx + 1); }
        function prev() { go(idx - 1); }
        function restart() { clearInterval(timer); timer = setInterval(next, 6000); }

        prevBtn?.addEventListener('click', prev);
        nextBtn?.addEventListener('click', next);

        // Touch swipe
        let sx = 0, ex = 0;
        track.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; }, { passive: true });
        track.addEventListener('touchend',   e => {
            ex = e.changedTouches[0].clientX;
            const dx = sx - ex;
            if (Math.abs(dx) > 50) (dx > 0 ? prev() : next());
        }, { passive: true });

        restart();
    }


    /* ---------------------------------------------------------
       5. FORM VALIDATION + WHATSAPP HANDOFF
       --------------------------------------------------------- */
    function initForm() {
        const form     = $('#loanForm');
        const submitBtn = $('#submitBtn');
        const success  = $('#apSuccess');
        const retry    = $('#retryLink');
        if (!form) return;

        const rules = {
            fullName: v => v.trim().split(/\s+/).length >= 2 ? '' : 'اكتب الاسم ثنائياً على الأقل',
            phone:    v => /^01[0-25][0-9]{8}$/.test(v.trim()) ? '' : 'رقم موبايل مصري غير صحيح',
            nid:      v => /^\d{14}$/.test(v.trim()) ? '' : 'الرقم القومي يجب أن يكون 14 رقماً',
        };

        // Restrictive inputs
        const phoneFld = $('#phone'), nidFld = $('#nid');
        phoneFld?.addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g,'').slice(0,11));
        nidFld?.addEventListener('input',   e => e.target.value = e.target.value.replace(/\D/g,'').slice(0,14));

        // Live validation
        Object.keys(rules).forEach(id => {
            const f = $('#' + id);
            if (!f) return;
            const validate = () => {
                const msg = rules[id](f.value);
                const errEl = f.closest('.fg')?.querySelector('.err-msg');
                if (errEl) errEl.textContent = msg;
                f.style.borderColor = msg ? 'var(--danger)' : '';
                return !msg;
            };
            f.addEventListener('blur', validate);
            f.addEventListener('input', () => { if (f.style.borderColor) validate(); });
        });

        function buildWaMessage(data) {
            return [
                '🏦 طلب تمويل جديد من الموقع الإلكتروني',
                '━━━━━━━━━━━━━━━━━━━━━',
                `👤 الاسم الكامل : ${data.fullName}`,
                `📱 رقم الموبايل : ${data.phone}`,
                `🪪 الرقم القومي : ${data.nid}`,
                `💼 الوظيفة      : ${data.job || 'غير محدد'}`,
                `💰 الدخل الشهري : ${data.income || 'غير محدد'}`,
                `💵 المبلغ المطلوب : ${data.amount ? Number(data.amount).toLocaleString('en-US') + ' ج.م' : 'غير محدد'}`,
                `📍 المحافظة    : ${data.gov || 'غير محدد'}`,
                `📝 ملاحظات     : ${data.notes || 'لا يوجد'}`,
                '━━━━━━━━━━━━━━━━━━━━━',
                `🕐 وقت التقديم : ${new Date().toLocaleString('ar-EG')}`,
                '',
                'مرحباً أستاذة نجلاء، أرغب في استكمال إجراءات التمويل.'
            ].join('\n');
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate required fields
            const fd = new FormData(form);
            const data = Object.fromEntries(fd.entries());
            let ok = true;
            Object.keys(rules).forEach(id => {
                const f = $('#' + id);
                const msg = rules[id](f.value);
                const errEl = f.closest('.fg')?.querySelector('.err-msg');
                if (errEl) errEl.textContent = msg;
                f.style.borderColor = msg ? 'var(--danger)' : '';
                if (msg) ok = false;
            });

            if (!ok) {
                submitBtn.animate([
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(-8px)' },
                    { transform: 'translateX(8px)' },
                    { transform: 'translateX(-4px)' },
                    { transform: 'translateX(4px)' },
                    { transform: 'translateX(0)' },
                ], { duration: 450, easing: 'ease-in-out' });
                return;
            }

            // Loading UI
            $('.sb-txt', submitBtn)?.classList.add('hidden');
            $('.sb-load', submitBtn)?.classList.remove('hidden');
            submitBtn.disabled = true;

            try {
                // Simulate brief processing (replace with real API call if needed)
                await new Promise(r => setTimeout(r, 1200));

                // Hand off to WhatsApp with prefilled message
                const txt = encodeURIComponent(buildWaMessage(data));
                const url = `https://wa.me/${WA_NUMBER}?text=${txt}`;
                window.open(url, '_blank', 'noopener,noreferrer');

                // Show success panel
                form.classList.add('hidden');
                success?.classList.remove('hidden');
            } catch (err) {
                console.error(err);
                alert('تعذّر الإرسال، حاول مرة أخرى أو تواصل مباشرة عبر واتساب.');
            } finally {
                $('.sb-txt', submitBtn)?.classList.remove('hidden');
                $('.sb-load', submitBtn)?.classList.add('hidden');
                submitBtn.disabled = false;
            }
        });

        retry?.addEventListener('click', (e) => {
            e.preventDefault();
            success?.classList.add('hidden');
            form.classList.remove('hidden');
            form.reset();
            $$('.err-msg', form).forEach(el => el.textContent = '');
            $$('input, select, textarea', form).forEach(el => el.style.borderColor = '');
        });
    }


    /* ---------------------------------------------------------
       6. SMOOTH ANCHOR SCROLLING (offset for taskbar)
       --------------------------------------------------------- */
    function initSmoothAnchors() {
        $$('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const id = a.getAttribute('href');
                if (id === '#' || id.length < 2) return;
                const tgt = document.querySelector(id);
                if (!tgt) return;
                e.preventDefault();
                const offset = tgt.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: offset, behavior: 'smooth' });
            });
        });
    }


    /* ---------------------------------------------------------
       7. INTERSECTION OBSERVER — Scroll Reveals
       --------------------------------------------------------- */
    function initReveals() {
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    en.target.classList.add('is-visible');
                    io.unobserve(en.target);
                }
            });
        }, { rootMargin: '0px 0px -80px 0px', threshold: 0.12 });

        $$('.reveal-on-scroll').forEach(el => io.observe(el));
    }


    /* ---------------------------------------------------------
       8. BACK TO TOP BUTTON
       --------------------------------------------------------- */
    function initBackToTop() {
        const btn = $('#backTop');
        if (!btn) return;
        const toggle = () => btn.classList.toggle('visible', window.scrollY > 700);
        window.addEventListener('scroll', toggle, { passive: true });
        toggle();
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }


    /* ---------------------------------------------------------
       9. VIDEO FALLBACK
       --------------------------------------------------------- */
    function initVideoFallback() {
        const vid = $('.hero-video');
        if (!vid) return;
        vid.addEventListener('error', () => {
            vid.style.display = 'none';
            const hero = $('.hero');
            if (hero) hero.style.background =
                'linear-gradient(135deg,#050b18 0%,#0f1e3d 40%,#16294f 70%,#050b18 100%)';
        });

        // Pause video when hero is off-screen (perf optimization)
        const heroSec = $('#hero');
        if (heroSec && 'IntersectionObserver' in window) {
            const vio = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) vid.play().catch(()=>{});
                else vid.pause();
            }, { threshold: 0.1 });
            vio.observe(heroSec);
        }
    }


    /* ---------------------------------------------------------
       BOOTSTRAP
       --------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        initHeroSequence();
        initTaskbar();
        initCalculator();
        initTestimonialSlider();
        initForm();
        initSmoothAnchors();
        initReveals();
        initBackToTop();
        initVideoFallback();

        console.log('%c✦ ABA Premium Landing Page ✦\n%cCrafted by Twofold Team',
            'color:#c9a84c;font-size:18px;font-weight:bold;font-family:Cormorant Garamond,serif;',
            'color:#8a9ab5;font-size:12px;');
    });

})();
