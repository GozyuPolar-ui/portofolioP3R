function setScaleK() {
    document.documentElement.style.setProperty('--k', Math.min(innerWidth / 1920, innerHeight / 1080).toFixed(4));
}
setScaleK();
window.addEventListener('resize', setScaleK);

const SMALL_SCREEN_MQ = window.matchMedia("(max-width: 1200px)");

function isDesktopViewport() {
    return !SMALL_SCREEN_MQ.matches;
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Tab") {
        event.preventDefault();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    let menuItems = document.querySelectorAll('.text');
    let itemSpans = document.querySelectorAll('.text span[id^="m_"]');
    let currentIndex = 0;

    const sideIndex = document.getElementById('side_index');
    const cmdDesc = document.getElementById('cmd_desc');
    const bottomBar = document.getElementById('bottom_bar');
    const siteFooter = document.getElementById('site_footer');
    const bgVideo = document.getElementById('bg_video');
    const container = document.getElementById('menu_container');


    const submenuOverlay = document.getElementById('submenu_overlay');
    const submenuBgOverlay = document.getElementById('submenu_bg_overlay');
    const submenuClickBackdrop = document.getElementById('submenu_click_backdrop');
    const submenuVideo = document.getElementById('submenu_video');
    const panels = document.querySelectorAll('.submenu-panel');
    const music = document.getElementById('music-toggle');

    let isSubmenuOpen = false;
    let currentPanel = null;
    // true = ↑↓ / scroll menggerakkan isi daftar (GitHub, IG, Email, dst) di panel ITEMS & SOCIAL LINK
    // false = ↑↓ / scroll pindah antar menu (Skills, About Me, dll)
    let inListMode = true;



    const highlightData = {
        m_skill: { transform: 'scale(130%) rotate(-28deg) translate(28px, 10px)', prefix: 'skill', panelId: 'panel_skill' },
        m_item: { transform: 'scale(130%) rotate(-14deg) translate(36px, 6px)', prefix: 'item', panelId: 'panel_item' },
        m_equip: { transform: 'scale(130%) rotate(-20deg) translate(32px, 8px)', prefix: 'equip', panelId: 'panel_equip' },
        m_persona: { transform: 'scale(130%) rotate(-18deg) translate(24px, 2px)', prefix: 'persona', panelId: 'panel_persona' },
        m_stats: { transform: 'scale(130%) translate(40px, -4px)', prefix: 'stats', panelId: 'panel_stats' },
        m_quest: { transform: 'scale(130%) rotate(-12deg) translate(36px, 4px)', prefix: 'quest', panelId: 'panel_quest' },
        m_socialLink: { transform: 'scale(130%) rotate(-6deg) translate(28px, -2px)', prefix: 'socialLink', panelId: 'panel_socialLink_bars' },
        m_calendar: { transform: 'scale(130%) rotate(-4deg) translate(26px, 0px)', prefix: 'calendar', panelId: 'panel_calendar' },
        m_system: { transform: 'scale(130%) rotate(8deg) translate(32px, 0px)', prefix: 'system', panelId: 'panel_system' },
    };


    const PRELOAD_MAX_MS = 10000;

    function waitForVideo(video, timeoutMs = 8000) {
        return new Promise((resolve) => {
            if (!video) {
                resolve();
                return;
            }

            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve();
            };

            const timer = window.setTimeout(finish, timeoutMs);

            if (video.readyState >= 3) {
                window.clearTimeout(timer);
                finish();
                return;
            }

            const onReady = () => {
                window.clearTimeout(timer);
                finish();
            };

            video.addEventListener('canplay', onReady, { once: true });
            video.addEventListener('loadeddata', onReady, { once: true });
            video.addEventListener('canplaythrough', onReady, { once: true });
            video.addEventListener('error', onReady, { once: true });

            try {
                if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                    video.load();
                }
            } catch (_) {
                onReady();
            }
        });
    }

    function waitForImage(img, timeoutMs = 5000) {
        return new Promise((resolve) => {
            if (!img) {
                resolve();
                return;
            }

            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve();
            };

            const timer = window.setTimeout(finish, timeoutMs);

            if (img.complete) {
                window.clearTimeout(timer);
                finish();
                return;
            }

            img.addEventListener('load', () => {
                window.clearTimeout(timer);
                finish();
            }, { once: true });
            img.addEventListener('error', () => {
                window.clearTimeout(timer);
                finish();
            }, { once: true });
        });
    }

    function preloadSubmenuVideoInBackground() {
        if (!submenuVideo) return;
        waitForVideo(submenuVideo, 20000).catch(() => { });
        try {
            if (submenuVideo.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                submenuVideo.load();
            }
        } catch (_) { /* ignore */ }
    }

    function preloadAllAssets() {
        const promises = [waitForVideo(bgVideo, 8000)];

        document.querySelectorAll('img').forEach((img) => {
            promises.push(waitForImage(img));
        });

        if (document.fonts && document.fonts.ready) {
            promises.push(
                Promise.race([
                    document.fonts.ready,
                    new Promise((resolve) => window.setTimeout(resolve, 3000)),
                ])
            );
        }

        preloadSubmenuVideoInBackground();

        return Promise.race([
            Promise.all(promises),
            new Promise((resolve) => window.setTimeout(resolve, PRELOAD_MAX_MS)),
        ]);
    }

    let desktopExperienceStarted = false;

    function hideLoadingScreen() {
        const loader = document.getElementById('loading_screen');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    function applyDesktopReadyState(animateMenu) {
        hideLoadingScreen();

        document.body.classList.add('loaded', 'desktop-ready');

        menuItems.forEach((item) => item.classList.remove('spawned'));
        void document.body.offsetWidth;

        if (animateMenu) {
            setTimeout(() => {
                const reversedItems = Array.from(menuItems).reverse();
                reversedItems.forEach((item, index) => {
                    setTimeout(() => item.classList.add('spawned'), index * 100);
                });
            }, 100);
            setTimeout(() => selectItem(0), 1200);
        } else {
            menuItems.forEach((item) => item.classList.add('spawned'));
            selectItem(0);
        }

        if (bgVideo) {
            bgVideo.play().catch(() => { });
        }

        window.dispatchEvent(new Event('resize'));
    }

    function deactivateForSmallScreen() {
        document.body.classList.remove('loaded', 'desktop-ready');
        document.querySelectorAll('video, audio').forEach((media) => media.pause());

        if (isSubmenuOpen) {
            closeSubmenu();
        }
        if (isMusicPlayerOpen) {
            closeMusicPlayer();
        }
    }

    function activateDesktopExperience(animateMenu) {
        if (!isDesktopViewport()) return;

        if (desktopExperienceStarted) {
            applyDesktopReadyState(animateMenu);
            return;
        }

        desktopExperienceStarted = true;
        preloadAllAssets()
            .then(() => applyDesktopReadyState(animateMenu))
            .catch(() => applyDesktopReadyState(animateMenu));
    }

    function handleViewportChange() {
        if (SMALL_SCREEN_MQ.matches) {
            deactivateForSmallScreen();
        } else {
            activateDesktopExperience(false);
        }
    }

    SMALL_SCREEN_MQ.addEventListener('change', handleViewportChange);

    if (isDesktopViewport()) {
        activateDesktopExperience(true);
    } else {
        preloadAllAssets().then(hideLoadingScreen).catch(hideLoadingScreen);
    }

    // Idle animation removed per user request


    // Suara navigasi UI (assets/deck_ui_navigation.wav). Dipakai ulang lewat cloneNode
    // supaya klik cepat beruntun tetap bunyi tanpa memotong suara sebelumnya.
    const NAV_SOUND_VOLUME = 0.5;
    const navSoundBase = new Audio('assets/deck_ui_navigation.wav');
    navSoundBase.preload = 'auto';

    function playNavSound() {
        try {
            const s = navSoundBase.cloneNode();
            s.volume = NAV_SOUND_VOLUME;
            const p = s.play();
            if (p && p.catch) p.catch(() => { });
        } catch (_) { /* audio diblokir / belum ada interaksi: abaikan */ }
    }

    function selectItem(index, force = false) {
        if (isSubmenuOpen && !force) return;

        if (index !== currentIndex) playNavSound();
        currentIndex = index;
        const itemSpan = itemSpans[currentIndex];
        const itemDiv = menuItems[currentIndex];

        // Reset every menu item
        itemSpans.forEach(i => {
            i.style.transform = '';
            i.style.zIndex = '';
            i.style.color = '';
        });


        document.querySelectorAll('.highlight-wrapper').forEach(wrapper => {
            wrapper.classList.remove('active');
            wrapper.style.opacity = '0';
        });

        // Hide all decoration elements
        document.querySelectorAll('[id^="t_"]').forEach(el => {
            el.style.opacity = '0';
        });


        const data = highlightData[itemSpan.id];
        if (data) {
            itemSpan.style.transform = data.transform;
            itemSpan.style.zIndex = '1';
            itemSpan.style.color = 'black';

            // Show the wrapper and make it active for pulse animation
            const wrapper = document.getElementById('hw_' + data.prefix);
            if (wrapper) {
                wrapper.classList.add('active');
                wrapper.style.opacity = '1';
            }

            // Show decoration overlays inside
            document.getElementById('t_' + data.prefix).style.opacity = '1';
            document.getElementById('t_' + data.prefix + 'w').style.opacity = '1';
            document.getElementById('t_' + data.prefix + 'ch').style.opacity = '1';
            document.getElementById('t_' + data.prefix + 'ch1').style.opacity = '1';
        }

        // Update Side Index
        if (sideIndex) {
            const num = itemDiv.getAttribute('data-index') || '1';
            sideIndex.innerHTML = `<span class="z-1">0${num}</span>`;
        }

        // Update Bottom Bar Description
        if (cmdDesc) {
            cmdDesc.textContent = itemDiv.getAttribute('data-desc') || '';
        }

        itemSpan.focus();
    }



    // Initial selection is now handled in the load event listener above

    const HERO_BAR_PANEL_IDS = new Set(['panel_item', 'panel_socialLink_bars']);
    const SOCIALS_TRANSITION_PANEL_IDS = new Set([
        'panel_item',
        'panel_socialLink_bars',
        'panel_calendar',
    ]);
    const PROSE_PANEL_IDS = new Set(['panel_skill', 'panel_persona', 'panel_system']);

    function isHeroBarsPanel(panel) {
        return panel && HERO_BAR_PANEL_IDS.has(panel.id);
    }

    function getTransitionVariant(panel) {
        if (panel && SOCIALS_TRANSITION_PANEL_IDS.has(panel.id)) return 'socials';
        if (panel && PROSE_PANEL_IDS.has(panel.id)) return 'default';
        return 'default';
    }

    function getSubmenuChrome(panel) {
        if (!panel) {
            return { overlay: false, menuShift: false, menuHide: false, photos: false };
        }
        if (HERO_BAR_PANEL_IDS.has(panel.id)) {
            return { overlay: true, menuShift: true, menuHide: false, photos: false };
        }
        if (panel.id === 'panel_calendar') {
            // list project + panel detail memenuhi layar, menu utama disembunyikan agar tidak menimpa
            return { overlay: true, menuShift: false, menuHide: true, photos: false };
        }
        if (PROSE_PANEL_IDS.has(panel.id)) {
            return { overlay: true, menuShift: false, photos: true };
        }
        return { overlay: false, menuShift: false, photos: false };
    }

    function applySubmenuChrome(chrome) {
        const { overlay, menuShift, menuHide, photos } = chrome;

        if (container) {
            container.classList.toggle('menu-shifted', !!menuShift);
            container.classList.toggle('menu-hidden', !!menuHide);
        }
        if (submenuBgOverlay) {
            submenuBgOverlay.classList.toggle('visible', !!overlay);
        }
        if (submenuVideo) {
            if (overlay) {
                submenuVideo.classList.add('visible');
                submenuVideo.play().catch(() => { });
            } else {
                submenuVideo.classList.remove('visible');
                setTimeout(() => submenuVideo.pause(), 500);
            }
        }

        const photosWrapper = document.getElementById('about_me_photos');
        if (photosWrapper) {
            if (photos) {
                photosWrapper.classList.add('visible');
                document.body.classList.add('submenu-photos-active');
                randomizePhotos();
            } else {
                photosWrapper.classList.remove('visible');
                document.body.classList.remove('submenu-photos-active');
                hidePhotos();
            }
        }
    }

    function syncSubmenuChrome() {
        applySubmenuChrome(getSubmenuChrome(currentPanel));
    }

    function openSubmenu() {
        if (isSubmenuOpen) return;
        isSubmenuOpen = true;
        inListMode = true;
        playNavSound();

        const data = highlightData[itemSpans[currentIndex].id];
        currentPanel = document.getElementById(data.panelId);
        const variant = getTransitionVariant(currentPanel);

        document.body.classList.add('submenu-open');
        submenuOverlay.classList.add('active');

        const panel = document.createElement('div');
        panel.className = `transition-panel ${variant}-panel`;
        panel.style.zIndex = '9999';
        document.body.appendChild(panel);

        setTimeout(() => {
            applySubmenuChrome(getSubmenuChrome(currentPanel));

            if (currentPanel) {
                currentPanel.classList.remove('hiding');
                currentPanel.classList.add('visible');
            }

            if (isHeroBarsPanel(currentPanel)) initSocialsPanel(currentPanel);
            else if (data.prefix === 'calendar') initResumePanel();

        }, 280);

        setTimeout(() => {
            if (panel.parentNode) panel.parentNode.removeChild(panel);
        }, 800);
    }

    function closeSubmenu() {
        if (!isSubmenuOpen) return;
        playNavSound();

        const panelToHide = currentPanel;

        if (panelToHide) {
            panelToHide.classList.remove('visible');
            panelToHide.classList.add('hiding');
        }

        applySubmenuChrome({ overlay: false, menuShift: false, photos: false });

        cleanupSocialsPanel();
        cleanupResumePanel();

        setTimeout(() => {
            isSubmenuOpen = false;
            submenuOverlay.classList.remove('active');
            document.body.classList.remove('submenu-open', 'submenu-photos-active');

            if (panelToHide) {
                panelToHide.classList.remove('hiding');
            }

            selectItem(currentIndex);
        }, 400);
    }



    // Pindah ke menu lain saat submenu masih terbuka (tanpa harus back dulu)
    function switchSubmenuTo(index) {
        if (!isSubmenuOpen) return;
                if (currentIndex !== index) {
                    // Pindah menu = kembali ke level pilihan menu (tekan A/Enter untuk masuk daftar)
                    inListMode = false;

                    // Hide old panel immediately
                    if (currentPanel) {
                        currentPanel.classList.remove('visible');
                        currentPanel.classList.add('hiding');
                    }

                    // Cleanup old custom panels
                    cleanupSocialsPanel();
                    cleanupResumePanel();

                    selectItem(index, true);

                    const data = highlightData[itemSpans[currentIndex].id];
                    currentPanel = document.getElementById(data.panelId);

                    syncSubmenuChrome();

                    if (currentPanel) {
                        currentPanel.classList.remove('hiding');
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                currentPanel.classList.add('visible');

                                if (isHeroBarsPanel(currentPanel)) initSocialsPanel(currentPanel);
                                else if (data.prefix === "calendar") initResumePanel();
                            });
                        });
                    }
                }
    }

    // Panel yang punya navigasi daftar sendiri (↑↓ / wheel dipakai untuk daftarnya)
    function panelHasOwnListNav() {
        return (isHeroBarsPanel(currentPanel) && inListMode) || (currentPanel && currentPanel.id === 'panel_calendar');
    }

    // Scroll mouse di panel biasa (About, Skills, System) = pindah ke menu sebelum/sesudahnya
    let submenuWheelLock = false;
    window.addEventListener('wheel', function (e) {
        if (!isSubmenuOpen || submenuWheelLock) return;
        if (Math.abs(e.deltaY) < 10) return;
        const dir = e.deltaY > 0 ? 1 : -1;
        // Panel ITEMS / SOCIAL LINK saat fokus di daftar: scroll menggeser pilihan GitHub / IG / Email
        if (isHeroBarsPanel(currentPanel) && inListMode) {
            submenuWheelLock = true;
            setTimeout(() => { submenuWheelLock = false; }, 200);
            moveSocialsSelection(dir);
            return;
        }
        if (panelHasOwnListNav()) return;
        submenuWheelLock = true;
        setTimeout(() => { submenuWheelLock = false; }, 450);
        switchSubmenuTo((currentIndex + dir + itemSpans.length) % itemSpans.length);
    }, { passive: true });

    // Keyboard navigation
    document.addEventListener("keydown", function (event) {
        if (isSubmenuOpen) {
            // Handle custom panel keys
            if (isHeroBarsPanel(currentPanel)) {
                if (inListMode) {
                    // B / Esc di dalam daftar: balik ke pilihan menu dulu, belum ke menu utama
                    if (event.key === "Escape" || event.key === "Backspace" || event.key === "b" || event.key === "B") {
                        exitSocialsList();
                        return;
                    }
                    if (handleSocialsKey(event)) return;
                } else if (event.key === "Enter" || event.key === " " || event.key === "a" || event.key === "A") {
                    // A / Enter di level menu: masuk lagi ke daftar
                    enterSocialsList();
                    return;
                }
            }
            if (currentPanel && currentPanel.id === 'panel_calendar') {
                if (handleResumeKey(event)) return;
            }

            // Panel biasa: ↑↓ / W S pindah ke menu lain
            if (!panelHasOwnListNav()) {
                if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
                    switchSubmenuTo((currentIndex + 1) % itemSpans.length);
                    return;
                }
                if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
                    switchSubmenuTo((currentIndex - 1 + itemSpans.length) % itemSpans.length);
                    return;
                }
            }

            // Handle submenu close
            if (event.key === "Escape" || event.key === "Backspace" || (event.key === "b" || event.key === "B")) {
                closeSubmenu();
            }
            return; // Block other navigation while in submenu
        }

        switch (event.key) {
            case "ArrowDown":
            case "s":
            case "S":
                selectItem((currentIndex + 1) % itemSpans.length);
                break;
            case "ArrowUp":
            case "w":
            case "W":
                selectItem((currentIndex - 1 + itemSpans.length) % itemSpans.length);
                break;
            case "Enter":
            case " ":
            case "a":
            case "A":
                openSubmenu();
                break;
            default:
                return;
        }
    });

    // Mouse hover navigation
    menuItems.forEach(function (row, index) {
        row.addEventListener("mouseenter", function () {
            if (!isSubmenuOpen) {
                selectItem(index);
            }
        });

        // Mouse click opens submenu
        row.addEventListener("click", function (e) {
            e.stopPropagation();
            if (isSubmenuOpen) {
                switchSubmenuTo(index);
            } else {
                selectItem(index);
                openSubmenu();
            }
        });
    });


    if (submenuClickBackdrop) {
        submenuClickBackdrop.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isSubmenuOpen) closeSubmenu();
        });
    }

    if (submenuBgOverlay) {
        submenuBgOverlay.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isSubmenuOpen) closeSubmenu();
        });
    }


    const PLAYLIST = [
        { src: "assets/When The Moon's Reaching Out Stars -Reload-.mp3", title: "When The Moon's Reaching Out Stars" },
        { src: "assets/Color Your Night.mp3", title: "Color Your Night" },
        { src: "assets/巌戸台分寮 -Reload-.mp3", title: "巌戸台分寮" },
    ];

    const musicToggle = document.getElementById('music_toggle');
    const musicPlayer = document.getElementById('music_player');
    const musicAudio = document.getElementById('music_audio');
    const musicTrackName = document.getElementById('music_track_name');
    const musicPlayPause = document.getElementById('music_play_pause');
    const musicPrev = document.getElementById('music_prev');
    const musicNext = document.getElementById('music_next');

    let musicTrackIndex = 0;
    let isMusicPlayerOpen = false;

    function updateMusicTrackLabel() {
        if (musicTrackName) {
            musicTrackName.textContent = PLAYLIST[musicTrackIndex].title;
        }
    }

    function updatePlayPauseButton() {
        if (!musicPlayPause || !musicAudio) return;
        const playing = !musicAudio.paused;
        musicPlayPause.textContent = playing ? '❚❚' : '▶';
        musicPlayPause.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        if (musicToggle) {
            musicToggle.classList.toggle('is-playing', playing);
        }
    }

    function loadMusicTrack(index, autoplay) {
        if (!musicAudio || !PLAYLIST.length) return;
        musicTrackIndex = (index + PLAYLIST.length) % PLAYLIST.length;
        const track = PLAYLIST[musicTrackIndex];
        musicAudio.src = track.src;
        updateMusicTrackLabel();
        if (autoplay) {
            musicAudio.play().catch(() => updatePlayPauseButton());
        }
        updatePlayPauseButton();
    }

    function openMusicPlayer() {
        if (!musicPlayer || !musicToggle) return;
        isMusicPlayerOpen = true;
        musicPlayer.classList.add('open');
        musicPlayer.setAttribute('aria-hidden', 'false');
        musicToggle.setAttribute('aria-expanded', 'true');



        updatePlayPauseButton();
    }

    function closeMusicPlayer() {
        if (!musicPlayer || !musicToggle) return;
        isMusicPlayerOpen = false;
        musicPlayer.classList.remove('open');
        musicPlayer.setAttribute('aria-hidden', 'true');
        musicToggle.setAttribute('aria-expanded', 'false');
    }

    function toggleMusicPlayer() {
        if (isMusicPlayerOpen) {
            closeMusicPlayer();
        } else {
            openMusicPlayer();
        }
    }

    function toggleMusicPlayback() {
        if (!musicAudio) return;
        if (!musicAudio.src) {
            loadMusicTrack(0, true);
            return;
        }
        if (musicAudio.paused) {
            musicAudio.play().catch(() => updatePlayPauseButton());
        } else {
            musicAudio.pause();
        }
        updatePlayPauseButton();
    }

    if (musicToggle) {
        musicToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMusicPlayer();
        });
    }

    if (musicPlayPause) {
        musicPlayPause.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMusicPlayback();
        });
    }

    if (musicPrev) {
        musicPrev.addEventListener('click', function (e) {
            e.stopPropagation();
            loadMusicTrack(musicTrackIndex - 1, true);
        });
    }

    if (musicNext) {
        musicNext.addEventListener('click', function (e) {
            e.stopPropagation();
            loadMusicTrack(musicTrackIndex + 1, true);
        });
    }

    if (musicAudio) {
        musicAudio.addEventListener('ended', function () {
            loadMusicTrack(musicTrackIndex + 1, true);
        });
        musicAudio.addEventListener('play', updatePlayPauseButton);
        musicAudio.addEventListener('pause', updatePlayPauseButton);
    }

    // --- Kontrol musik lewat keyboard (mouse dinonaktifkan) ---
    //   M = play / pause,  ← = lagu sebelumnya,  → = lagu berikutnya
    // Pemutar muncul sebentar menampilkan judul lagu, lalu menutup sendiri.
    let musicFlashTimer = null;

    function flashMusicPlayer() {
        openMusicPlayer();
        window.clearTimeout(musicFlashTimer);
        musicFlashTimer = window.setTimeout(closeMusicPlayer, 2200);
    }

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
        const hasTrack = !!(musicAudio && musicAudio.src);

        if (event.key === 'm' || event.key === 'M') {
            toggleMusicPlayback();
            flashMusicPlayer();
        } else if (event.key === 'ArrowRight') {
            loadMusicTrack(hasTrack ? musicTrackIndex + 1 : 0, true);
            flashMusicPlayer();
        } else if (event.key === 'ArrowLeft') {
            loadMusicTrack(hasTrack ? musicTrackIndex - 1 : 0, true);
            flashMusicPlayer();
        }
    });

    document.addEventListener('click', function (event) {
        if (!isMusicPlayerOpen) return;
        if (!event.target.closest('#music_player') && !event.target.closest('#music_toggle')) {
            closeMusicPlayer();
        }
    });


    // Tombol A (Confirm) & B (Back) di kanan bawah: sama persis dengan tekan Enter / Escape
    const btnConfirm = document.getElementById('btn_confirm');
    const btnBack = document.getElementById('btn_back');

    function pressKey(key) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
    }

    if (btnConfirm) {
        btnConfirm.addEventListener('click', function (e) {
            e.stopPropagation();
            pressKey('Enter');
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', function (e) {
            e.stopPropagation();
            pressKey('Escape');
        });
    }

    // Tombol M (Music): sama dengan menekan M (play / pause)
    const btnMusic = document.getElementById('btn_music');
    if (btnMusic) {
        btnMusic.addEventListener('click', function (e) {
            e.stopPropagation();
            pressKey('m');
        });
    }


const predefinedPositions = [
    { left: '2vw',  top: '5vh',  rot: -8 },
    { left: '18vw', top: '22vh', rot: 12 },
    { left: '4vw',  top: '45vh', rot: -5 },
    { left: '22vw', top: '60vh', rot: 15 },
    { left: '8vw',  top: '75vh', rot: -10 }
];

    function randomizePhotos() {
        const photos = Array.from(document.querySelectorAll('.photo-container'));

        // Make sure all are hidden initially
        photos.forEach(photo => {
            photo.classList.remove('show');
        });


        const numToShow = 5;

        // Shuffle photos and positions
        const shuffledPhotos = [...photos].sort(() => 0.5 - Math.random()).slice(0, numToShow);
        const shuffledPositions = [...predefinedPositions].sort(() => 0.5 - Math.random()).slice(0, numToShow);

        // Small timeout to allow transition resets if needed
        setTimeout(() => {
            shuffledPhotos.forEach((photo, i) => {
                const pos = shuffledPositions[i];
                photo.style.left = pos.left;
                photo.style.top = pos.top;
                photo.style.setProperty('--rot', pos.rot);

                // Stagger spawn
                setTimeout(() => {
                    photo.classList.add('show');
                }, i * 80); // 80ms stagger
            });
        }, 20);
    }

    function hidePhotos() {
        const photos = document.querySelectorAll('.photo-container');
        photos.forEach(photo => {
            photo.classList.remove('show');
        });
    }

    // --- Socials Panel Logic (ITEMS + SOCIAL LINK — independent instances) ---
    let scActiveIndex = 0;
    let scLastIndex = -1; // -1 = belum ada pilihan sebelumnya (tidak bunyi saat panel baru dibuka)
    let scPanelEl = null;
    let scBars = [];
    let scBarHandlers = [];

    // Kecilkan nilai (mis. email panjang) kalau tidak muat di kolomnya. Dengan font asli
    // biasanya tidak aktif; ini jaga-jaga kalau font fallback lebih lebar / layar sempit.
    function fitSocialValues(root) {
        if (!root) return;
        root.querySelectorAll('.sc-stat').forEach((stat) => {
            const num = stat.querySelector('.sc-stat-num');
            const tag = stat.querySelector('.sc-stat-tag');
            if (!num) return;
            num.style.fontSize = '';
            const gap = parseFloat(getComputedStyle(stat.querySelector('.sc-stat-top')).columnGap) || 0;
            const avail = stat.getBoundingClientRect().width - (tag ? tag.getBoundingClientRect().width : 0) - gap;
            const need = num.getBoundingClientRect().width;
            if (avail > 0 && need > avail) {
                const size = parseFloat(getComputedStyle(num).fontSize);
                num.style.fontSize = (size * avail / need * 0.98).toFixed(2) + 'px';
            }
        });
    }

    function initSocialsPanel(panelEl) {
        cleanupSocialsPanel();
        scPanelEl = panelEl || document.getElementById('panel_item');
        if (!scPanelEl) return;

        fitSocialValues(scPanelEl.querySelector('.sc-root--social'));

        scActiveIndex = 0;
        scLastIndex = -1;
        scBars = Array.from(scPanelEl.querySelectorAll('.sc-bar-outer'));

        scBars.forEach((bar, i) => {
            bar.classList.add('sc-mounted');
            const onEnter = () => {
                if (!inListMode) return;
                scActiveIndex = i;
                updateSocialsSelection();
            };
            const onClick = () => {
                scActiveIndex = i;
                inListMode = true;
                updateSocialsSelection();
                openSocialsLink();
            };
            bar.addEventListener('mouseenter', onEnter);
            bar.addEventListener('click', onClick);
            scBarHandlers.push({ bar, onEnter, onClick });
        });

        const scFooter = scPanelEl.querySelector('.sc-footer');
        if (scFooter) scFooter.classList.add('sc-mounted');

        const scRightNav = scPanelEl.querySelector('.sc-right-nav');
        if (scRightNav) {
            scRightNav.style.display = 'flex';
            setTimeout(() => { scRightNav.style.opacity = '1'; }, 100);
        }

        updateSocialsSelection();
    }

    function cleanupSocialsPanel() {
        scBarHandlers.forEach(({ bar, onEnter, onClick }) => {
            bar.removeEventListener('mouseenter', onEnter);
            bar.removeEventListener('click', onClick);
            bar.classList.remove('sc-mounted');
            bar.classList.remove('active');
        });
        scBarHandlers = [];

        if (scPanelEl) {
            const scFooter = scPanelEl.querySelector('.sc-footer');
            if (scFooter) scFooter.classList.remove('sc-mounted');

            const scRightNav = scPanelEl.querySelector('.sc-right-nav');
            if (scRightNav) {
                scRightNav.style.opacity = '0';
                setTimeout(() => { scRightNav.style.display = 'none'; }, 400);
            }
        }

        scBars = [];
        scPanelEl = null;
    }

    function updateSocialsSelection() {
        if (scLastIndex !== scActiveIndex) {
            if (scLastIndex !== -1 && inListMode) playNavSound();
            scLastIndex = scActiveIndex;
        }
        scBars.forEach((bar, i) => {
            // Highlight cuma muncul saat fokus ada di daftar
            if (inListMode && i === scActiveIndex) bar.classList.add('active');
            else bar.classList.remove('active');
        });
        const labelEl = scPanelEl ? scPanelEl.querySelector('.sc-nav-label') : null;
        const activeBar = scBars[scActiveIndex];
        if (labelEl) labelEl.textContent = (activeBar && activeBar.dataset.nav) || ('ITEM ' + (scActiveIndex + 1));
    }

    function openSocialsLink() {
        // link diambil dari atribut data-link di tiap bar (ITEMS tidak punya link)
        const bar = scBars[scActiveIndex];
        const link = bar && bar.dataset.link;
        if (!link) return;
        if (link.startsWith('mailto:')) {
            window.location.href = link;
        } else {
            window.open(link, '_blank', 'noopener');
        }
    }

    function moveSocialsSelection(dir) {
        if (!scBars.length) return;
        scActiveIndex = (scActiveIndex + dir + scBars.length) % scBars.length;
        updateSocialsSelection();
    }

    function exitSocialsList() {
        inListMode = false;
        playNavSound();
        updateSocialsSelection();
    }

    function enterSocialsList() {
        inListMode = true;
        playNavSound();
        updateSocialsSelection();
    }

    function handleSocialsKey(event) {
        if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
            scActiveIndex = (scActiveIndex + 1) % scBars.length;
            updateSocialsSelection();
            return true;
        }
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
            scActiveIndex = (scActiveIndex - 1 + scBars.length) % scBars.length;
            updateSocialsSelection();
            return true;
        }
        if (event.key === "Enter" || event.key === " " || event.key === "a" || event.key === "A") {
            openSocialsLink();
            return true;
        }
        return false;
    }


    // --- Resume Panel Logic ---
    // ====== DAFTAR PROJECT: tambah/ubah di sini ======
    const GH = 'https://github.com/GozyuPolar-ui';
    const PROJECTS = [
        { title: 'E.D.I.T.H.', sub: 'Desktop AI Assistant', desc: 'JARVIS-style desktop AI assistant (Python, WebSocket)', link: 'https://github.com/GozyuPolar-ui/E.D.I.T.H-Personal-AI.git' },
        { title: 'PIXELVALE', sub: 'Indie Game Platform', desc: 'Indie game distribution platform (Next.js, Supabase)', link: 'https://github.com/GozyuPolar-ui/PixelValeWeb.git' },
        { title: 'MISTS OF DAWN', sub: 'RPG Maker MZ Game', desc: 'RPG built in RPG Maker MZ, deployed as Android APK', link: 'https://github.com/GozyuPolar-ui' },
        { title: 'EXCEEDOG', sub: 'Fan Site', desc: 'KURO Games fan site (HTML/CSS/JS, GSAP)', link: 'https://github.com/GozyuPolar-ui' },
        { title: 'MYPORTOFOLIO', sub: 'Portfolio Site', desc: 'Personal portfolio with HUD/holographic design, on Vercel', link: 'https://github.com/GozyuPolar-ui' },
        { title: 'FIGURE TRACKER', sub: 'Laravel CRUD App', desc: 'Figure collection manager, built to learn Laravel', link: GH, status: 'In progress' },
        { title: 'JURUSAN EXPERT', sub: 'Expert System', desc: 'Recommends university majors for Indonesian high school seniors', link: 'https://github.com/GozyuPolar-ui' },
        { title: 'UMKM ORDERS', sub: 'Order & Catalog', desc: 'UMKM ordering system and catalog (HTML/CSS/JS, Supabase)', link: 'https://github.com/GozyuPolar-ui/Tugas-UMKM.git', status: 'Complete' }
    ];

    const rsToRoman = n => {
        const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
        let r = '';
        for (const [v, s] of m) while (n >= v) { r += s; n -= v; }
        return r;
    };
    const rsPad = n => String(n).padStart(2, '0');

    let rsActiveIndex = 0;
    let rsLastIndex = -1; // -1 = belum ada pilihan sebelumnya (tidak bunyi saat panel baru dibuka)
    const rsStack = document.getElementById('rs_stack');
    if (rsStack) {
        rsStack.insertAdjacentHTML('beforeend', PROJECTS.map((p, i) => `
            <div class="resume-card-wrap" id="rs_card_${i}" style="transition-delay: ${Math.min(i, 8) * 55}ms">
                <div class="resume-card">
                    <div class="resume-badge"><div class="resume-badge-text">${rsToRoman(i + 1)}</div></div>
                    <div class="resume-card-inner">
                        <div class="resume-title">${p.title}</div>
                        <div class="resume-rank">
                            <div class="resume-rank-label">RANK</div>
                            <div class="resume-rank-number">${i + 1}</div>
                        </div>
                    </div>
                    <div class="resume-subtitle-bar"><div class="resume-subtitle">${p.sub}</div></div>
                </div>
            </div>`).join(''));
    }
    const rsCards = document.querySelectorAll('.resume-card-wrap');
    rsCards.forEach((card, i) => {
        card.addEventListener('mouseenter', () => { rsActiveIndex = i; updateResumeSelection(); });
        card.addEventListener('click', () => { rsActiveIndex = i; openResumeLink(); });
    });

    function initResumePanel() {
        rsActiveIndex = 0;
        rsLastIndex = -1;
        if (rsStack) rsStack.scrollTop = 0;
        updateResumeSelection();

        const listTag = document.getElementById('rs_list_tag');
        if (listTag) listTag.classList.add('rs-mounted');
        rsCards.forEach(card => card.classList.add('rs-mounted'));

        const detailPanel = document.getElementById('rs_detail_panel');
        if (detailPanel) {
            setTimeout(() => { detailPanel.style.opacity = '1'; }, 200);
        }
    }

    function cleanupResumePanel() {
        rsCards.forEach(card => {
            card.classList.remove('rs-mounted');
            card.classList.remove('active');
        });
        const listTag = document.getElementById('rs_list_tag');
        if (listTag) listTag.classList.remove('rs-mounted');

        const detailPanel = document.getElementById('rs_detail_panel');
        if (detailPanel) detailPanel.style.opacity = '0';
    }

    function rsScrollToActive() {
        const card = rsCards[rsActiveIndex];
        if (!card || !rsStack) return;
        const pad = 16;
        const top = card.offsetTop;
        const bottom = top + card.offsetHeight;
        if (top - pad < rsStack.scrollTop) {
            rsStack.scrollTo({ top: Math.max(0, top - pad), behavior: 'smooth' });
        } else if (bottom + pad > rsStack.scrollTop + rsStack.clientHeight) {
            rsStack.scrollTo({ top: bottom + pad - rsStack.clientHeight, behavior: 'smooth' });
        }
    }

    function updateResumeSelection() {
        if (rsLastIndex !== rsActiveIndex) {
            if (rsLastIndex !== -1) playNavSound();
            rsLastIndex = rsActiveIndex;
        }
        rsCards.forEach((card, i) => card.classList.toggle('active', i === rsActiveIndex));

        const p = PROJECTS[rsActiveIndex];
        document.getElementById('rs_detail_index').textContent = rsPad(rsActiveIndex + 1);
        document.getElementById('rs_detail_title').textContent = p.title;
        document.getElementById('rs_detail_progress').textContent = (rsActiveIndex + 1) + '/' + PROJECTS.length;
        const status = document.getElementById('rs_detail_status');
        if (status) status.textContent = p.status || 'Personal';

        const bulletsContainer = document.getElementById('rs_detail_bullets');
        if (bulletsContainer) {
            let html = `<div class="resume-detail-bullet">- ${p.desc}</div>`;
            if (p.link) {
                html += `<div class="resume-detail-bullet"><a href="${p.link}" target="_blank">View on GitHub</a></div>`;
            }
            bulletsContainer.innerHTML = html;
        }
    }

    function openResumeLink() {
        const link = PROJECTS[rsActiveIndex] && PROJECTS[rsActiveIndex].link;
        if (link) window.open(link, '_blank');
    }

    function handleResumeKey(event) {
        if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
            rsActiveIndex = (rsActiveIndex + 1) % rsCards.length;
            updateResumeSelection();
            rsScrollToActive();
            return true;
        }
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
            rsActiveIndex = (rsActiveIndex - 1 + rsCards.length) % rsCards.length;
            updateResumeSelection();
            rsScrollToActive();
            return true;
        }
        if (event.key === "Enter" || event.key === " " || event.key === "a" || event.key === "A") {
            openResumeLink();
            return true;
        }
        return false;
    }
});

// crt i guess
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class ScreenEffect {
    constructor(parent, options) {
        this.parent = parent;
        if (typeof parent === "string") {
            this.parent = document.querySelector(parent);
        }

        this.config = Object.assign({}, {}, options)
        this.effects = {};
        this.events = {
            resize: this.onResize.bind(this)
        };

        window.addEventListener("resize", this.events.resize, false);
        this.render();
    }

    render() {
        const container = document.createElement("div");
        container.classList.add("screen-container");

        const wrapper1 = document.createElement("div");
        wrapper1.classList.add("screen-wrapper");

        const wrapper2 = document.createElement("div");
        wrapper2.classList.add("screen-wrapper");

        const wrapper3 = document.createElement("div");
        wrapper3.classList.add("screen-wrapper");

        wrapper1.appendChild(wrapper2);
        wrapper2.appendChild(wrapper3);

        container.appendChild(wrapper1);

        this.parent.parentNode.insertBefore(container, this.parent);
        wrapper3.appendChild(this.parent);

        this.nodes = { container, wrapper1, wrapper2, wrapper3 };
        this.onResize();
    }

    onResize(e) {
        this.rect = this.parent.getBoundingClientRect();
        if (this.effects.vcr && !!this.effects.vcr.enabled) {
            this.generateVCRNoise();
        }
    }

    add(type, options) {
        const config = Object.assign({}, {
            fps: 30,
            blur: 1
        }, options);

        if (Array.isArray(type)) {
            for (const t of type) {
                this.add(t);
            }
            return this;
        }

        const that = this;

        if (type === "snow") {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.classList.add(type);
            canvas.width = this.rect.width / 2;
            canvas.height = this.rect.height / 2;

            this.nodes.wrapper2.appendChild(canvas);

            animate();

            function animate() {
                that.generateSnow(ctx);
                that.snowframe = requestAnimationFrame(animate);
            }

            this.effects[type] = {
                wrapper: this.nodes.wrapper2,
                node: canvas,
                enabled: true,
                config
            };
            return this;
        }

        if (type === "roll") {
            return this.enableRoll();
        }

        if (type === "vcr") {
            const canvas = document.createElement("canvas");
            canvas.classList.add(type);
            this.nodes.wrapper2.appendChild(canvas);

            canvas.width = this.rect.width;
            canvas.height = this.rect.height;

            this.effects[type] = {
                wrapper: this.nodes.wrapper2,
                node: canvas,
                ctx: canvas.getContext("2d"),
                enabled: true,
                config
            };

            this.generateVCRNoise();
            return this;
        }

        let node = false;
        let wrapper = this.nodes.wrapper2;

        switch (type) {
            case "wobblex":
            case "wobbley":
                wrapper.classList.add(type);
                break;
            case "scanlines":
                node = document.createElement("div");
                node.classList.add(type);
                wrapper.appendChild(node);
                break;
            case "vignette":
                wrapper = this.nodes.container;
                node = document.createElement("div");
                node.classList.add(type);
                wrapper.appendChild(node);
                break;
            case "image":
                wrapper = this.parent;
                node = document.createElement('img');
                node.classList.add(type);
                node.src = config.src;
                wrapper.appendChild(node);
                break;
            case "video":
                wrapper = this.parent;
                node = document.createElement('video');
                node.classList.add(type);
                node.src = config.src;
                node.crossOrigin = 'anonymous';
                node.autoplay = true;
                node.muted = true;
                node.loop = true;
                wrapper.appendChild(node);
                break;
        }

        this.effects[type] = {
            wrapper,
            node,
            enabled: true,
            config
        };
        return this;
    }

    remove(type) {
        const obj = this.effects[type];
        if (type in this.effects && !!obj.enabled) {
            obj.enabled = false;

            if (type === "roll" && obj.original) {
                this.parent.appendChild(obj.original);
            }

            if (type === "vcr") {
                clearInterval(this.vcrInterval);
            }

            if (type === "snow") {
                cancelAnimationFrame(this.snowframe);
            }

            if (obj.node) {
                obj.wrapper.removeChild(obj.node);
            } else {
                obj.wrapper.classList.remove(type);
            }
        }
        return this;
    }

    enableRoll() {
        const el = this.parent.firstElementChild;
        if (el) {
            const div = document.createElement("div");
            div.classList.add("roller");
            this.parent.appendChild(div);
            div.appendChild(el);
            div.appendChild(el.cloneNode(true));

            this.effects.roll = {
                enabled: true,
                wrapper: this.parent,
                node: div,
                original: el
            };
        }
    }

    generateVCRNoise() {
        const canvas = this.effects.vcr.node;
        const config = this.effects.vcr.config;
        const div = this.effects.vcr.node;

        if (config.fps >= 60) {
            cancelAnimationFrame(this.vcrInterval);
            const animate = () => {
                this.renderTrackingNoise();
                this.vcrInterval = requestAnimationFrame(animate);
            };
            animate();
        } else {
            clearInterval(this.vcrInterval);
            this.vcrInterval = setInterval(() => {
                this.renderTrackingNoise();
            }, 1000 / config.fps);
        }
    }

    generateSnow(ctx) {
        var w = ctx.canvas.width,
            h = ctx.canvas.height,
            d = ctx.createImageData(w, h),
            b = new Uint32Array(d.data.buffer),
            len = b.length;

        for (var i = 0; i < len; i++) {
            b[i] = ((255 * Math.random()) | 0) << 24;
        }

        ctx.putImageData(d, 0, 0);
    }

    renderTrackingNoise(radius = 2, xmax, ymax) {
        const canvas = this.effects.vcr.node;
        const ctx = this.effects.vcr.ctx;
        const config = this.effects.vcr.config;
        let posy1 = config.miny || 0;
        let posy2 = config.maxy || canvas.height;
        let posy3 = config.miny2 || 0;
        const num = config.num || 20;

        if (xmax === undefined) {
            xmax = canvas.width;
        }
        if (ymax === undefined) {
            ymax = canvas.height;
        }

        canvas.style.filter = `blur(${config.blur}px)`;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = `#fff`;

        ctx.beginPath();
        for (var i = 0; i <= num; i++) {
            var x = Math.random(i) * xmax;
            var y1 = getRandomInt(posy1 += 3, posy2);
            var y2 = getRandomInt(0, posy3 -= 3);
            ctx.fillRect(x, y1, radius, radius);
            ctx.fillRect(x, y2, radius, radius);
            ctx.fill();

            this.renderTail(ctx, x, y1, radius);
            this.renderTail(ctx, x, y2, radius);
        }
        ctx.closePath();
    }

    renderTail(ctx, x, y, radius) {
        const n = getRandomInt(1, 50);
        const dirs = [1, -1];
        let rd = radius;
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        for (let i = 0; i < n; i++) {
            const step = 0.01;
            let r = getRandomInt((rd -= step), radius);
            let dx = getRandomInt(1, 4);
            radius -= 0.1;
            dx *= dir;
            ctx.fillRect((x += dx), y, r, r);
            ctx.fill();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const screen = new ScreenEffect("#screen", {});

    function initScreenEffects() {
        if (screen.effects.snow) return;
        screen.add("vignette");
        screen.add("scanlines");
        screen.add("vcr", {
            opacity: 1,
            miny: 220,
            miny2: 220,
            num: 70,
            fps: 60
        });
        
        screen.add("snow", {
            opacity: 0.2
        });
    }

    if (document.body.classList.contains("loaded")) {
        initScreenEffects();
    } else {
        const onReady = () => {
            if (document.body.classList.contains("loaded")) {
                initScreenEffects();
                observer.disconnect();
            }
        };
        const observer = new MutationObserver(onReady);
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        window.setTimeout(initScreenEffects, 12000);
    }
});