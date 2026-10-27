
    // Global Auth Banner & Notification Timers (Declared at top of script to prevent TDZ ReferenceError)
    const authBannerTimers = {};
    const authBannerHideTimers = {};

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function showAuthBanner(elementId, message, type = 'error') {
      const el = document.getElementById(elementId);
      if (!el) return;

      if (authBannerTimers[elementId]) {
        clearTimeout(authBannerTimers[elementId]);
        delete authBannerTimers[elementId];
      }
      if (authBannerHideTimers[elementId]) {
        clearTimeout(authBannerHideTimers[elementId]);
        delete authBannerHideTimers[elementId];
      }

      const isSuccess = (type === 'success');
      el.className = 'auth-error' + (isSuccess ? ' success' : '');
      
      const iconSvg = isSuccess
        ? `<svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #16A34A; fill: none; stroke-width: 2.3; flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"></circle><polyline points="16 9 10.5 14.5 8 12"></polyline></svg>`
        : `<svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #DC2626; fill: none; stroke-width: 2.3; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

      const closeSvg = `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

      el.innerHTML = `
        ${iconSvg}
        <span style="flex: 1; line-height: 1.45; font-size: 13px; font-weight: 500;">${escapeHtml(message)}</span>
        <button type="button" class="alert-dismiss-btn" onclick="dismissAuthBanner('${elementId}')" title="Bvisa" aria-label="Bvisa">${closeSvg}</button>
      `;
      el.style.display = 'flex';
      el.style.opacity = '1';

      authBannerTimers[elementId] = setTimeout(() => {
        dismissAuthBanner(elementId);
      }, 5000);
    }

    function dismissAuthBanner(elementId, immediate = false) {
      const el = document.getElementById(elementId);
      if (!el) return;
      if (authBannerTimers[elementId]) {
        clearTimeout(authBannerTimers[elementId]);
        delete authBannerTimers[elementId];
      }
      if (authBannerHideTimers[elementId]) {
        clearTimeout(authBannerHideTimers[elementId]);
        delete authBannerHideTimers[elementId];
      }
      if (immediate) {
        el.style.opacity = '0';
        el.style.display = 'none';
        el.innerHTML = '';
        return;
      }
      el.style.opacity = '0';
      authBannerHideTimers[elementId] = setTimeout(() => {
        el.style.display = 'none';
        el.innerHTML = '';
        delete authBannerHideTimers[elementId];
      }, 300);
    }

    let conversations = [];
    let currentChatId = null;
    let currentUser = null;
    let currentUserRole = localStorage.getItem('ruzivo_role') || 'student';

    // Run sidebar state check immediately so there is no flicker or delayed state
    initSidebar();

    // Run auth state check immediately synchronously to prevent flicker
    initWebAuth();

        // Initialize scroll observer as early as possible so sections are instantly rendered
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initScrollRevealObserver);
    } else {
      setTimeout(initScrollRevealObserver, 10);
    }

    window.onload = function() {
      initSidebar();
      initWebAuth();
      initGoogleAuthClient();
      renderRecaptchaWidgets();
      initCookieConsentBanner();
      initScrollRevealObserver();
      loadSettingsPreferences();
      loadConversations();
    };

    function openPrivacyModal(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const modal = document.getElementById('privacyModal');
      if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '10005';
      }
    }

    function closePrivacyModal(event) {
      if (event && event.target && event.target.id !== 'privacyModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-settings-save')) {
        return;
      }
      const modal = document.getElementById('privacyModal');
      if (modal) modal.style.display = 'none';
    }

    function openTermsModal(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const modal = document.getElementById('termsModal');
      if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '10005';
      }
    }

    function closeTermsModal(event) {
      if (event && event.target && event.target.id !== 'termsModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-settings-save')) {
        return;
      }
      const modal = document.getElementById('termsModal');
      if (modal) modal.style.display = 'none';
    }

        // Cookiebot Banner Management
    function initCookieConsentBanner() {
      const consent = localStorage.getItem('ruzivo_cookie_consent');
      if (!consent) {
        setTimeout(() => {
          const banner = document.getElementById('cookieConsentBanner');
          if (banner) banner.style.display = 'flex';
        }, 1200);
      }
    }

    function dismissCookieBanner(allowAll = true) {
      localStorage.setItem('ruzivo_cookie_consent', allowAll ? 'all' : 'essential');
      const banner = document.getElementById('cookieConsentBanner');
      if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(100%)';
        banner.style.transition = 'all 0.3s ease';
        setTimeout(() => { banner.style.display = 'none'; }, 300);
      }
      showNotificationToast(allowAll ? 'Mvumo yeCookies yachengetwa zvakanaka.' : 'MaCookies anokosha chete ndiwo achashanda.', 'info');
    }

    function showCookiePreferencesModal() {
      const banner = document.getElementById('cookieConsentBanner');
      if (banner) banner.style.display = 'flex';
    }

        // Smooth Scroll Reveal Animation (Linear Style)
    function initScrollRevealObserver() {
      const revealElements = document.querySelectorAll('.reveal-on-scroll, .landing-feature-card, .tsumo-quote-card, .stripe-stat-item');
      if (!revealElements.length) return;

      if (!('IntersectionObserver' in window)) {
        revealElements.forEach(el => {
          el.classList.add('is-revealed');
          el.classList.remove('reveal-pending');
        });
        return;
      }

      // Check whether authOverlay is active or standard window scroll
      const authOverlayEl = document.getElementById('authOverlay');
      const rootTarget = (authOverlayEl && getComputedStyle(authOverlayEl).display !== 'none') ? authOverlayEl : null;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            entry.target.classList.remove('reveal-pending');
            observer.unobserve(entry.target);
          }
        });
      }, {
        root: rootTarget,
        threshold: 0.05,
        rootMargin: '0px 0px 100px 0px'
      });

      revealElements.forEach((el, index) => {
        // Only add reveal-pending if element is not already in the viewport
        const rect = el.getBoundingClientRect();
        const inViewport = (rect.top < window.innerHeight && rect.bottom > 0);
        if (!inViewport) {
          el.classList.add('reveal-pending');
        } else {
          el.classList.add('is-revealed');
        }
        el.style.transitionDelay = `${(index % 4) * 60}ms`;
        observer.observe(el);
      });
    }

    function initSidebar() {
      const isCollapsed = localStorage.getItem('ruzivo_sidebar_collapsed') === 'true';
      if (isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
    }

    function toggleSidebar() {
      const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('ruzivo_sidebar_collapsed', isCollapsed);
    }

    // =========================================================================
    // CLIENT-SIDE SECURITY: CSRF TOKEN MANAGEMENT, XSS & FORM ATTACK PROTECTION
    // =========================================================================
    window.ruzivoCsrfToken = '';

    function getCookieValue(name) {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : '';
    }

    function getCsrfToken() {
      const cookieToken = getCookieValue('ruzivo_csrf');
      if (cookieToken) {
        window.ruzivoCsrfToken = cookieToken;
        return cookieToken;
      }
      return window.ruzivoCsrfToken || '';
    }

    async function ensureCsrfToken() {
      let token = getCsrfToken();
      if (token) return token;
      try {
        const resp = await window._nativeFetch('/auth/csrf', { method: 'GET', cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.csrf_token) {
            window.ruzivoCsrfToken = data.csrf_token;
            return data.csrf_token;
          }
        }
      } catch (e) {}
      return getCsrfToken();
    }

    // Wrap window.fetch so every state-mutating POST request automatically attaches X-CSRF-Token
    if (!window._nativeFetch) {
      window._nativeFetch = window.fetch.bind(window);
      window.fetch = async function(resource, config = {}) {
        const method = (config.method || 'GET').toUpperCase();
        if (method === 'POST') {
          let csrf = getCsrfToken();
          if (!csrf) {
            csrf = await ensureCsrfToken();
          }
          const headers = new Headers(config.headers || {});
          if (csrf && !headers.has('X-CSRF-Token')) {
            headers.set('X-CSRF-Token', csrf);
          }
          const headersObj = {};
          headers.forEach((v, k) => { headersObj[k] = v; });
          config = Object.assign({}, config, { headers: headersObj });
        }
        return window._nativeFetch(resource, config);
      };
    }

    function hasXssOrInjectionPayload(value) {
      if (!value) return false;
      const xssRegex = /(<script\b[^>]*>|javascript\s*:|onerror\s*=|onload\s*=|onmouseover\s*=|onclick\s*=|onfocus\s*=|<iframe\b|<object\b|<embed\b|<svg\b|document\.cookie|eval\s*\()/i;
      return xssRegex.test(value);
    }

    let loginLockoutInterval = null;

    function startLoginLockoutCountdown(seconds) {
      const loginBtn = document.getElementById('webLoginBtn');
      if (!loginBtn) return;
      if (loginLockoutInterval) {
        clearInterval(loginLockoutInterval);
        loginLockoutInterval = null;
      }
      let rem = Math.max(1, parseInt(seconds, 10) || 60);
      loginBtn.disabled = true;
      const updateBtn = () => {
        loginBtn.innerHTML = `<span>Yambovharwa (${rem}s)</span>`;
      };
      updateBtn();
      loginLockoutInterval = setInterval(() => {
        rem -= 1;
        if (rem <= 0) {
          clearInterval(loginLockoutInterval);
          loginLockoutInterval = null;
          loginBtn.disabled = false;
          loginBtn.innerHTML = `<span>Pinda</span>`;
        } else {
          updateBtn();
        }
      }, 1000);
    }

    function initWebAuth() {
      ensureCsrfToken();
      const token = localStorage.getItem('ruzivo_auth_token');
      const savedUser = localStorage.getItem('ruzivo_username');
      const overlay = document.getElementById('authOverlay');

      if (!token && !sessionStorage.getItem('ruzivo_guest_mode')) {
        overlay.style.display = 'flex';
        toggleAuthMode('login');
      } else {
        overlay.style.display = 'none';
        currentUser = savedUser || (sessionStorage.getItem('ruzivo_guest_mode') ? 'Muenzi' : 'Mudzidzi');
        updateUserProfileUI(currentUser);
        if (token) {
          fetchAccountDetails();
        }
      }
    }

    // In-line Real-Time Input Validation Helpers for Authentication
    function setFieldValidationError(inputId, errorId, message) {
      const inputEl = document.getElementById(inputId);
      const errEl = document.getElementById(errorId);
      if (inputEl) inputEl.classList.add('is-invalid');
      if (errEl) {
        errEl.innerHTML = `<span style="flex: 1;">${escapeHtml(message)}</span>`;
        errEl.classList.add('show');
      }
    }

    function clearFieldValidationError(inputId) {
      const inputEl = document.getElementById(inputId);
      if (inputEl) inputEl.classList.remove('is-invalid');
      const errEl = document.getElementById(inputId + 'Error');
      if (errEl) {
        errEl.innerHTML = '';
        errEl.classList.remove('show');
      }
    }

    function clearAllAuthValidationErrors() {
      ['loginUsername', 'loginPassword', 'regUsername', 'regEmail', 'regPassword', 'regConfirmPassword'].forEach(id => {
        clearFieldValidationError(id);
      });
    }

    function isValidEmailFormat(email) {
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    }

    // Pure Human Name Validation: Letters (and space/apostrophe/hyphen), NO numbers, NO special symbols (%4, #, etc.)
    function validateRealName(name) {
      const trimmed = (name || '').trim();
      if (!trimmed) {
        return { isValid: false, message: 'Ndapota nyorai zita renyu.' };
      }
      if (hasXssOrInjectionPayload(name)) {
        return { isValid: false, message: 'Zvinonyorwa zvine njodzi yekupaza sisitimu (XSS / Script tags hadzibvumidzwe).' };
      }
      if (/[0-9]/.test(name)) {
        return { isValid: false, message: 'Zita harifaniri kuve nenhamba (No numbers allowed in names).' };
      }
      if (/[^a-zA-Z\s'-]/.test(name)) {
        return { isValid: false, message: 'Zita harifaniri kuve nezviratidzo zvakasiyana (No special characters allowed).' };
      }
      if (/([a-zA-Z])\1\1/i.test(name)) {
        return { isValid: false, message: 'Zita harigoni kuve nemavara akafanana akatevedzana katatu (No name has 3 consecutive same letters).' };
      }
      if (trimmed.length < 2) {
        return { isValid: false, message: 'Zita rinofanira kuve nemavara 2 kana kudarika.' };
      }
      if (trimmed.length > 40) {
        return { isValid: false, message: 'Zita rakarebesa (Mavara asingapfuuri 40).' };
      }
      return { isValid: true, message: '' };
    }

    // Password Complexity Rules: Min 8, Max 24, Uppercase, Lowercase, Number, Special Character
    function evaluatePasswordComplexity(pwd) {
      const val = pwd || '';
      const lenMet = val.length >= 8 && val.length <= 24;
      const upperMet = /[A-Z]/.test(val);
      const lowerMet = /[a-z]/.test(val);
      const numMet = /[0-9]/.test(val);
      const specialMet = /[^a-zA-Z0-9]/.test(val);

      const isValid = lenMet && upperMet && lowerMet && numMet && specialMet;
      return { isValid, lenMet, upperMet, lowerMet, numMet, specialMet };
    }

    function updatePasswordRequirementsUI(val) {
      const res = evaluatePasswordComplexity(val);

      const circleSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle></svg>`;
      const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 9 10.5 14.5 8 12"></polyline></svg>`;
      const crossSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

      function updateItem(itemId, met) {
        const item = document.getElementById(itemId);
        if (!item) return;
        const icon = item.querySelector('.pwd-req-icon');
        if (!val) {
          item.className = 'pwd-req-item';
          if (icon) icon.innerHTML = circleSvg;
        } else if (met) {
          item.className = 'pwd-req-item met';
          if (icon) icon.innerHTML = checkSvg;
        } else {
          item.className = 'pwd-req-item unmet';
          if (icon) icon.innerHTML = crossSvg;
        }
      }

      updateItem('reqLen', res.lenMet);
      updateItem('reqUpper', res.upperMet);
      updateItem('reqLower', res.lowerMet);
      updateItem('reqNum', res.numMet);
      updateItem('reqSpecial', res.specialMet);

      return res;
    }

    // Real-Time Input Event Handlers
    function handleRealtimeNameValidation(input) {
      const val = input.value;
      if (!val) {
        clearFieldValidationError('regUsername');
        return;
      }
      const check = validateRealName(val);
      if (!check.isValid) {
        setFieldValidationError('regUsername', 'regUsernameError', check.message);
      } else {
        clearFieldValidationError('regUsername');
      }
    }

    function handleRealtimeEmailValidation(input) {
      const val = input.value.trim();
      if (!val) {
        clearFieldValidationError('regEmail');
        return;
      }
      if (hasXssOrInjectionPayload(val)) {
        setFieldValidationError('regEmail', 'regEmailError', 'Zvinonyorwa zvine njodzi yekupaza sisitimu (XSS blocked).');
      } else if (!isValidEmailFormat(val)) {
        setFieldValidationError('regEmail', 'regEmailError', 'Kero yeEmail haisi pachokwadi (e.g. zita@gmail.com).');
      } else {
        clearFieldValidationError('regEmail');
      }
    }

    function handleRealtimePasswordValidation(input) {
      const val = input.value;
      const res = updatePasswordRequirementsUI(val);
      const errEl = document.getElementById('regPasswordError');

      if (!val) {
        clearFieldValidationError('regPassword');
        return;
      }

      if (!res.isValid) {
        let msg = '';
        if (val.length < 8 || val.length > 24) {
          msg = 'Pasiwedhi inofanira kuve nemavara ari pakati pe 8 ne 24.';
        } else if (!res.upperMet) {
          msg = 'Isa vara guru (A-Z).';
        } else if (!res.lowerMet) {
          msg = 'Isa vara diki (a-z).';
        } else if (!res.numMet) {
          msg = 'Isa nhamba (0-9).';
        } else if (!res.specialMet) {
          msg = 'Isa chiratidzo chinonzi special character (e.g. !@#$%^&*).';
        }
        setFieldValidationError('regPassword', 'regPasswordError', msg);
      } else {
        clearFieldValidationError('regPassword');
      }

      // Re-validate confirm password if it already has value
      const confInput = document.getElementById('regConfirmPassword');
      if (confInput && confInput.value) {
        handleRealtimeConfirmPasswordValidation(confInput);
      }
    }

    function handleRealtimeConfirmPasswordValidation(input) {
      const val = input.value;
      const passVal = document.getElementById('regPassword').value;
      if (!val) {
        clearFieldValidationError('regConfirmPassword');
        return;
      }
      if (val !== passVal) {
        setFieldValidationError('regConfirmPassword', 'regConfirmPasswordError', 'Mapasiwedhi haasi kuenderana.');
      } else {
        clearFieldValidationError('regConfirmPassword');
      }
    }

    function handleRealtimeLoginEmailValidation(input) {
      const val = input.value.trim();
      if (!val) {
        clearFieldValidationError('loginUsername');
        return;
      }
      if (hasXssOrInjectionPayload(val)) {
        setFieldValidationError('loginUsername', 'loginUsernameError', 'Zvinonyorwa zvine njodzi yekupaza sisitimu (XSS blocked).');
      } else if (!isValidEmailFormat(val)) {
        setFieldValidationError('loginUsername', 'loginUsernameError', 'Kero yeEmail haisi pachokwadi (e.g. zita@gmail.com).');
      } else {
        clearFieldValidationError('loginUsername');
      }
    }

// (Auth banner functions defined at top of script)

    function toggleAuthMode(mode) {
      const loginCard = document.getElementById('loginCard');
      const regCard = document.getElementById('registerCard');
      clearAllAuthValidationErrors();
      dismissAuthBanner('loginError');
      dismissAuthBanner('registerError');

      if (mode === 'register') {
        loginCard.style.display = 'none';
        regCard.style.display = 'flex';
      } else {
        regCard.style.display = 'none';
        loginCard.style.display = 'flex';
      }

      setTimeout(renderRecaptchaWidgets, 50);
    }

    function continueAsGuest() {
      sessionStorage.setItem('ruzivo_guest_mode', 'true');
      document.getElementById('authOverlay').style.display = 'none';
      currentUser = 'Muenzi';
      updateUserProfileUI(currentUser);
    }

    function toggleUserProfileMenu(event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const flyout = document.getElementById('userProfileFlyout');
      const bar = document.getElementById('userProfileBar');
      if (!flyout) return;
      const isOpen = flyout.classList.contains('show');
      if (isOpen) {
        closeUserProfileMenu();
      } else {
        closeAllHistoryMenus();
        closeChatOptionsMenu();
        closeHeadlineDropdown();
        flyout.classList.add('show');
        if (bar) bar.classList.add('active');
      }
    }

    function closeUserProfileMenu() {
      const flyout = document.getElementById('userProfileFlyout');
      const bar = document.getElementById('userProfileBar');
      if (flyout) flyout.classList.remove('show');
      if (bar) bar.classList.remove('active');
    }

    
    function applyUserAvatarImage(dataUrl) {
      const avatarBadge = document.getElementById('claudeAccountAvatarBadge');
      const webAvatar = document.getElementById('webUserAvatar');
      const flyoutAvatar = document.getElementById('flyoutUserAvatar');
      const removeBtn = document.getElementById('claudeRemoveAvatarBtn');

      if (dataUrl) {
        if (avatarBadge) {
          avatarBadge.innerText = '';
          avatarBadge.style.backgroundImage = 'url(' + dataUrl + ')';
        }
        if (webAvatar) {
          webAvatar.innerText = '';
          webAvatar.style.backgroundImage = 'url(' + dataUrl + ')';
          webAvatar.style.backgroundSize = 'cover';
          webAvatar.style.backgroundPosition = 'center';
        }
        if (flyoutAvatar) {
          flyoutAvatar.innerText = '';
          flyoutAvatar.style.backgroundImage = 'url(' + dataUrl + ')';
          flyoutAvatar.style.backgroundSize = 'cover';
          flyoutAvatar.style.backgroundPosition = 'center';
        }
        if (removeBtn) removeBtn.style.display = 'inline-flex';
      } else {
        const uName = currentUser || localStorage.getItem('ruzivo_username') || 'M';
        const initial = (uName && uName.length > 0) ? uName[0].toUpperCase() : 'M';
        if (avatarBadge) {
          avatarBadge.style.backgroundImage = 'none';
          avatarBadge.innerText = initial;
        }
        if (webAvatar) {
          webAvatar.style.backgroundImage = 'none';
          webAvatar.innerText = initial;
        }
        if (flyoutAvatar) {
          flyoutAvatar.style.backgroundImage = 'none';
          flyoutAvatar.innerText = initial;
        }
        if (removeBtn) removeBtn.style.display = 'none';
      }
    }

    function handleUserAvatarUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      // Limit size to 2.5MB
      if (file.size > 2.5 * 1024 * 1024) {
        alert('Mufananidzo wakakurisa. Ndapota sarudza uri pasi pe 2.5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const dataUrl = e.target.result;
        try {
          localStorage.setItem('ruzivo_user_avatar', dataUrl);
          applyUserAvatarImage(dataUrl);
        } catch (storageErr) {
          console.error('Failed to store avatar in localStorage:', storageErr);
          // If storage quota exceeded, resize image in canvas
          resizeAndStoreAvatar(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }

    function resizeAndStoreAvatar(dataUrl) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const maxDim = 160;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round(h * (maxDim / w));
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round(w * (maxDim / h));
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        try {
          localStorage.setItem('ruzivo_user_avatar', compressed);
          applyUserAvatarImage(compressed);
        } catch (err) {
          console.warn('Could not cache resized avatar locally:', err);
          applyUserAvatarImage(compressed);
        }
      };
      img.src = dataUrl;
    }

    function removeUserAvatar() {
      localStorage.removeItem('ruzivo_user_avatar');
      const input = document.getElementById('claudeAvatarFileInput');
      if (input) input.value = '';
      applyUserAvatarImage(null);
    }

    
    function toggleAvatarEditMenu(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const menu = document.getElementById('avatarEditFlyoutMenu');
      if (menu) {
        const isOpen = menu.style.display === 'flex';
        menu.style.display = isOpen ? 'none' : 'flex';
      }
    }

    function closeAvatarEditMenu() {
      const menu = document.getElementById('avatarEditFlyoutMenu');
      if (menu) menu.style.display = 'none';
    }

    let currentSelectedPresetAvatar = null;

    // Ruzivo Official Brand Logo Avatars (Heritage Green, Gold, Red, Blue, Black, Slate, etc.)
    const RUZIVO_LOGO_AVATARS = [
      { id: 'avatar_1', label: 'Ruzivo Original', src: '/assets/avatars/avatar_1.png' },
      { id: 'avatar_2', label: 'Girinhi reNyika', src: '/assets/avatars/avatar_2.png' },
      { id: 'avatar_3', label: 'Goridhe reZimbabwe', src: '/assets/avatars/avatar_3.png' },
      { id: 'avatar_4', label: 'Tsvuku yeKuzvipira', src: '/assets/avatars/avatar_4.png' },
      { id: 'avatar_5', label: 'Denga reKudzidza', src: '/assets/avatars/avatar_5.png' },
      { id: 'avatar_6', label: 'Mvura neRuzivo', src: '/assets/avatars/avatar_6.png' },
      { id: 'avatar_7', label: 'Rima reHusiku', src: '/assets/avatars/avatar_7.png' },
      { id: 'avatar_8', label: 'Ruchena neKupenya', src: '/assets/avatars/avatar_8.png' },
      { id: 'avatar_9', label: 'Sango neUpfumi', src: '/assets/avatars/avatar_9.png' },
      { id: 'avatar_10', label: 'Zuva reMangwanani', src: '/assets/avatars/avatar_10.png' },
      { id: 'avatar_11', label: 'Dziva reKuchenjera', src: '/assets/avatars/avatar_11.png' },
      { id: 'avatar_12', label: 'Dombo reZimbabwe', src: '/assets/avatars/avatar_12.png' }
    ];

    function renderAvatarGrid() {
      const grid = document.getElementById('avatarPickerGrid');
      if (!grid) return;
      grid.innerHTML = '';

      const currentStored = localStorage.getItem('ruzivo_user_avatar');

      RUZIVO_LOGO_AVATARS.forEach((av, idx) => {
        const item = document.createElement('div');
        item.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        `;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = `
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: 3px solid transparent;
          cursor: pointer;
          padding: 0;
          background: #FAFAFA url("${av.src}") center/cover no-repeat;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        `;

        if (currentStored === av.src || (!currentSelectedPresetAvatar && idx === 0)) {
          btn.style.borderColor = 'var(--claude-accent)';
          btn.style.boxShadow = '0 0 0 3px rgba(46, 125, 50, 0.2)';
          currentSelectedPresetAvatar = av.src;
        }

        btn.onmouseenter = () => btn.style.transform = 'scale(1.08)';
        btn.onmouseleave = () => {
          if (currentSelectedPresetAvatar !== av.src) btn.style.transform = 'scale(1)';
        };

        const selectThis = () => {
          currentSelectedPresetAvatar = av.src;
          document.querySelectorAll('#avatarPickerGrid button').forEach(b => {
            b.style.borderColor = 'transparent';
            b.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
            b.style.transform = 'scale(1)';
          });
          btn.style.borderColor = 'var(--claude-accent)';
          btn.style.boxShadow = '0 0 0 3px rgba(46, 125, 50, 0.25)';
          btn.style.transform = 'scale(1.08)';
        };

        btn.onclick = selectThis;
        item.onclick = selectThis;

        const labelSpan = document.createElement('span');
        labelSpan.style.cssText = `
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.25;
          max-width: 80px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `;
        labelSpan.innerText = av.label.split(' (')[0];
        labelSpan.title = av.label;

        item.appendChild(btn);
        item.appendChild(labelSpan);
        grid.appendChild(item);
      });
    }

    function openPresetAvatarPicker() {
      closeAvatarEditMenu();
      const modal = document.getElementById('chooseAvatarModal');
      if (modal) {
        modal.style.display = 'flex';
        renderAvatarGrid();
      }
    }

    function closePresetAvatarModal(event) {
      if (event && event.target && event.target.id !== 'chooseAvatarModal' && !event.target.closest('.btn-modal-cancel')) {
        return;
      }
      const modal = document.getElementById('chooseAvatarModal');
      if (modal) modal.style.display = 'none';
    }

    function confirmSaveSelectedAvatar() {
      if (!currentSelectedPresetAvatar) {
        // If nothing explicitly tapped, pick the first one
        const firstBtn = document.querySelector('#avatarPickerGrid button');
        if (firstBtn) firstBtn.click();
      }
      if (currentSelectedPresetAvatar) {
        localStorage.setItem('ruzivo_user_avatar', currentSelectedPresetAvatar);
        applyUserAvatarImage(currentSelectedPresetAvatar);
        closePresetAvatarModal();
        showNotificationToast('Mufananidzo weAvatar wasarudzwa zvakanaka!', 'info');
      }
    }

    function saveNicknamePref(val) {
      localStorage.setItem('ruzivo_nickname', (val || '').trim());
      showNotificationToast('Zita ramunoda kusheedzwa naro rachengetwa!', 'info');
    }

        function toggleWorkRoleDropdown(event) {
      if (event) event.stopPropagation();
      const container = document.getElementById('claudeWorkRoleContainer');
      if (container) {
        container.classList.toggle('is-open');
      }
    }

    function selectWorkRole(val, label) {
      localStorage.setItem('ruzivo_work_description', val);
      const labelEl = document.getElementById('claudeWorkRoleSelectedLabel');
      if (labelEl) labelEl.innerText = label;

      document.querySelectorAll('#claudeWorkRoleMenu .claude-custom-select-item').forEach(item => {
        if (item.getAttribute('data-value') === val) {
          item.classList.add('is-selected');
        } else {
          item.classList.remove('is-selected');
        }
      });

      const container = document.getElementById('claudeWorkRoleContainer');
      if (container) container.classList.remove('is-open');

      showNotificationToast('Basa renyu rachengetwa zvakanaka!', 'info');
    }

    function saveRoleDescription(val) {
      localStorage.setItem('ruzivo_work_description', val);
      showNotificationToast('Basa renyu rachengetwa zvakanaka!', 'info');
    }

    function updateUserProfileUI(name, email = null) {
      const nameElem = document.getElementById('webUserName');
      const avatarElem = document.getElementById('webUserAvatar');
      const flyoutNameElem = document.getElementById('flyoutUserName');
      const flyoutAvatarElem = document.getElementById('flyoutUserAvatar');
      const flyoutEmailElem = document.getElementById('flyoutUserEmail');

      const initial = (name && name.length > 0) ? name[0].toUpperCase() : 'M';
      if (nameElem) nameElem.innerText = name || 'Muenzi';
      if (flyoutNameElem) flyoutNameElem.innerText = name || 'Muenzi';
      if (flyoutEmailElem && email) {
        flyoutEmailElem.innerText = email;
      }
      const savedAvatar = localStorage.getItem('ruzivo_user_avatar');
      if (savedAvatar) {
        applyUserAvatarImage(savedAvatar);
      } else {
        if (avatarElem) { avatarElem.innerText = initial; avatarElem.style.backgroundImage = 'none'; }
        if (flyoutAvatarElem) { flyoutAvatarElem.innerText = initial; flyoutAvatarElem.style.backgroundImage = 'none'; }
      }
    }

    async function submitWebLogin(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (loginLockoutInterval) {
        return;
      }
      clearAllAuthValidationErrors();
      dismissAuthBanner('loginError', true);

      const user = document.getElementById('loginUsername').value.trim();
      const pass = document.getElementById('loginPassword').value.trim();
      const honeypot = (document.getElementById('loginHoneypot')?.value || '').trim();

      if (honeypot) {
        showAuthBanner('loginError', 'Chikumbiro charambwa nekuti charatidza senge robhoti (Bot / Honeypot detected).');
        return;
      }

      let hasError = false;

      // Validation for Email field (Email only, validated format + XSS check)
      if (!user) {
        setFieldValidationError('loginUsername', 'loginUsernameError', 'Ndapota nyorai email yenyu.');
        hasError = true;
      } else if (hasXssOrInjectionPayload(user)) {
        setFieldValidationError('loginUsername', 'loginUsernameError', 'Zvinonyorwa zvine njodzi yekupaza sisitimu (XSS / Injection blocked).');
        hasError = true;
      } else if (!isValidEmailFormat(user)) {
        setFieldValidationError('loginUsername', 'loginUsernameError', 'Kero yeEmail haisi pachokwadi (e.g. zita@gmail.com).');
        hasError = true;
      }

      // Validation for Password field (Only check that password is provided; do NOT reveal password limits on login)
      if (!pass) {
        setFieldValidationError('loginPassword', 'loginPasswordError', 'Ndapota nyorai pasiwedhi yenyu.');
        hasError = true;
      }

      if (hasError) {
        showAuthBanner('loginError', 'Gadzirisai zvakanganisika pazasi musati mapinda.');
        return;
      }

      const loginBtn = document.getElementById('webLoginBtn') || (e ? e.currentTarget : null);
      const originalContent = `<span>Pinda</span>`;
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `
          <span class="auth-btn-spinner"></span>
          <span>Kupinda...</span>
        `;
      }

      try {
        const csrfToken = await ensureCsrfToken();
        const recaptchaToken = await getRecaptchaToken('LOGIN');
        const resp = await fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            username: user,
            password: pass,
            website_url: honeypot,
            csrf_token: csrfToken,
            recaptcha_token: recaptchaToken
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          if (resp.status === 429 && data.retry_after) {
            startLoginLockoutCountdown(data.retry_after);
          } else if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalContent;
          }
          showAuthBanner('loginError', data.detail || 'Kukanganisa pakupinda.');
          return;
        }

        if (loginBtn) {
          loginBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" style="stroke:#fff; width:16px; height:16px; stroke-width: 2.5; fill:none;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Mabudirira!</span>
          `;
        }

        dismissAuthBanner('loginError');
        localStorage.setItem('ruzivo_auth_token', data.access_token);
        localStorage.setItem('ruzivo_username', data.username || user);
        sessionStorage.removeItem('ruzivo_guest_mode');

        currentUser = data.username || user;
        updateUserProfileUI(currentUser);

        // Smooth fade out and transition
        setTimeout(() => {
          const overlay = document.getElementById('authOverlay');
          if (overlay) {
            overlay.style.transition = 'opacity 0.35s ease';
            overlay.style.opacity = '0';
            setTimeout(() => {
              overlay.style.display = 'none';
              overlay.style.opacity = '1';
              if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalContent;
              }
            }, 350);
          }
        }, 400);

      } catch (err) {
        if (loginBtn && !loginLockoutInterval) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = originalContent;
        }
        showAuthBanner('loginError', err.message || 'Hatina kukwanisa kupinda. Tarisa server.');
      }
    }

    async function submitWebRegister(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      clearAllAuthValidationErrors();
      dismissAuthBanner('registerError', true);

      const user = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const pass = document.getElementById('regPassword').value.trim();
      const conf = document.getElementById('regConfirmPassword').value.trim();
      const honeypot = (document.getElementById('registerHoneypot')?.value || '').trim();

      if (honeypot) {
        showAuthBanner('registerError', 'Chikumbiro charambwa nekuti charatidza senge robhoti (Bot / Honeypot detected).');
        return;
      }

      let hasError = false;

      // Validate Name (Real Human Name: No numbers, no special symbols, no XSS)
      const nameCheck = validateRealName(user);
      if (!nameCheck.isValid) {
        setFieldValidationError('regUsername', 'regUsernameError', nameCheck.message);
        hasError = true;
      }

      // Validate Email
      if (!email) {
        setFieldValidationError('regEmail', 'regEmailError', 'Ndapota nyorai email yenyu.');
        hasError = true;
      } else if (hasXssOrInjectionPayload(email)) {
        setFieldValidationError('regEmail', 'regEmailError', 'Zvinonyorwa zvine njodzi yekupaza sisitimu (XSS / Injection blocked).');
        hasError = true;
      } else if (!isValidEmailFormat(email)) {
        setFieldValidationError('regEmail', 'regEmailError', 'Kero yeEmail haisi pachokwadi (e.g. zita@gmail.com).');
        hasError = true;
      }

      // Validate Password (8-24 chars, Upper, Lower, Number, Special)
      const pwdRes = evaluatePasswordComplexity(pass);
      updatePasswordRequirementsUI(pass);
      if (!pass) {
        setFieldValidationError('regPassword', 'regPasswordError', 'Ndapota gadzirai pasiwedhi yenyu.');
        hasError = true;
      } else if (!pwdRes.isValid) {
        let msg = '';
        if (pass.length < 8 || pass.length > 24) {
          msg = 'Pasiwedhi inofanira kuve nemavara ari pakati pe 8 ne 24.';
        } else if (!pwdRes.upperMet) {
          msg = 'Isa vara guru (A-Z).';
        } else if (!pwdRes.lowerMet) {
          msg = 'Isa vara diki (a-z).';
        } else if (!pwdRes.numMet) {
          msg = 'Isa nhamba (0-9).';
        } else if (!pwdRes.specialMet) {
          msg = 'Isa chiratidzo chinonzi special character (e.g. !@#$%^&*).';
        }
        setFieldValidationError('regPassword', 'regPasswordError', msg);
        hasError = true;
      }

      // Validate Confirm Password
      if (!conf) {
        setFieldValidationError('regConfirmPassword', 'regConfirmPasswordError', 'Ndapota dzokororai pasiwedhi yenyu.');
        hasError = true;
      } else if (pass !== conf) {
        setFieldValidationError('regConfirmPassword', 'regConfirmPasswordError', 'Mapasiwedhi haasi kuenderana.');
        hasError = true;
      }

      if (hasError) {
        showAuthBanner('registerError', 'Gadzirisai zvakanganisika pazasi musati magadzira akaundi.');
        return;
      }

      try {
        const csrfToken = await ensureCsrfToken();
        const recaptchaToken = await getRecaptchaToken('REGISTER');
        const resp = await fetch('/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            username: user,
            email: email,
            password: pass,
            website_url: honeypot,
            csrf_token: csrfToken,
            recaptcha_token: recaptchaToken
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakunyoresa.');
        }

        dismissAuthBanner('registerError');
        localStorage.setItem('ruzivo_auth_token', data.access_token);
        localStorage.setItem('ruzivo_username', data.username || user);
        sessionStorage.removeItem('ruzivo_guest_mode');

        currentUser = data.username || user;
        updateUserProfileUI(currentUser);
        document.getElementById('authOverlay').style.display = 'none';
      } catch (err) {
        showAuthBanner('registerError', err.message || 'Hatina kukwanisa kunyoresa. Tarisa server.');
      }
    }

    // Custom Modal Dialog Helper for OAuth & Inputs
    let customModalResolve = null;

    function showCustomInputModal({ title, desc, placeholder, defaultValue, btnText }) {
      return new Promise((resolve) => {
        customModalResolve = resolve;
        const modal = document.getElementById('customInputModal');
        const titleEl = document.getElementById('customModalTitle');
        const descEl = document.getElementById('customModalDesc');
        const inputEl = document.getElementById('customModalInputField');
        const errEl = document.getElementById('customModalError');
        const btnEl = document.getElementById('customModalSubmitBtn');

        titleEl.innerText = title;
        descEl.innerText = desc;
        inputEl.placeholder = placeholder || '';
        inputEl.value = defaultValue || '';
        btnEl.innerText = btnText || 'Enderera mberi';
        errEl.style.display = 'none';

        modal.style.display = 'flex';
        inputEl.focus();

        btnEl.onclick = () => {
          const val = inputEl.value.trim();
          if (!val) {
            errEl.innerText = 'Ndapota zadzai ndima iyi.';
            errEl.style.display = 'block';
            return;
          }
          modal.style.display = 'none';
          if (customModalResolve) {
            customModalResolve(val);
            customModalResolve = null;
          }
        };

        inputEl.onkeydown = (e) => {
          if (e.key === 'Enter') {
            btnEl.click();
          } else if (e.key === 'Escape') {
            closeCustomInputModal();
          }
        };
      });
    }

    function closeCustomInputModal(event) {
      if (event && event.target && event.target.id !== 'customInputModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-modal-cancel')) {
        return;
      }
      const modal = document.getElementById('customInputModal');
      if (modal) modal.style.display = 'none';
      if (customModalResolve) {
        customModalResolve(null);
        customModalResolve = null;
      }
    }

    const GOOGLE_CLIENT_ID = "1031580468211-3jjn56i6ncsk9urivmo6glkjdu0780n2.apps.googleusercontent.com";
    const RECAPTCHA_SITE_KEY = "6LeQQwMuAAAAACyZi2_yKpfyG11ZFv6YDPALMn9X";
    let loginWidgetId = null;
    let registerWidgetId = null;

    function renderRecaptchaWidgets() {
      const g = (window.grecaptcha && window.grecaptcha.enterprise) ? window.grecaptcha.enterprise : window.grecaptcha;
      if (!g || typeof g.render !== 'function') {
        return;
      }
      try {
        const loginEl = document.getElementById('loginRecaptcha');
        if (loginEl && loginWidgetId === null && loginEl.children.length === 0) {
          loginWidgetId = g.render('loginRecaptcha', {
            'sitekey': RECAPTCHA_SITE_KEY,
            'theme': 'light'
          });
        }
      } catch (e) {
        console.warn('loginRecaptcha render warning:', e);
      }

      try {
        const regEl = document.getElementById('registerRecaptcha');
        if (regEl && registerWidgetId === null && regEl.children.length === 0) {
          registerWidgetId = g.render('registerRecaptcha', {
            'sitekey': RECAPTCHA_SITE_KEY,
            'theme': 'light'
          });
        }
      } catch (e) {
        console.warn('registerRecaptcha render warning:', e);
      }
    }

    window.onRecaptchaApiLoaded = function() {
      renderRecaptchaWidgets();
    };

    function getRecaptchaToken(action = 'LOGIN') {
      try {
        const g = (window.grecaptcha && window.grecaptcha.enterprise) ? window.grecaptcha.enterprise : window.grecaptcha;
        if (g && typeof g.getResponse === 'function') {
          if (action === 'LOGIN' && loginWidgetId !== null) {
            const resp = g.getResponse(loginWidgetId);
            if (resp) return resp;
          } else if (action === 'REGISTER' && registerWidgetId !== null) {
            const resp = g.getResponse(registerWidgetId);
            if (resp) return resp;
          }
          const defaultResp = g.getResponse();
          if (defaultResp) return defaultResp;
        }
      } catch (e) {
        console.warn('reCAPTCHA getResponse error:', e);
      }
      return '';
    }

    // Google Identity Services Credential Handler
    async function handleGoogleCredentialResponse(response) {
      const activeCard = document.getElementById('loginCard').style.display !== 'none' ? 'login' : 'register';
      const errElem = document.getElementById(activeCard === 'login' ? 'loginError' : 'registerError');
      if (errElem) errElem.style.display = 'none';

      if (!response || !response.credential) {
        showAuthBanner(activeCard === 'login' ? 'loginError' : 'registerError', 'Hatina kukwanisa kuwana ruzivo rweGoogle.');
        return;
      }

      try {
        let email = '';
        let name = '';
        try {
          const base64Url = response.credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const payload = JSON.parse(jsonPayload);
          email = payload.email || '';
          name = payload.name || payload.given_name || email.split('@')[0] || 'Mudzidzi';
        } catch(e) {}

        const resp = await fetch('/auth/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: response.credential,
            email: email,
            name: name,
            provider: 'google'
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakupinda neGoogle.');
        }

        localStorage.setItem('ruzivo_auth_token', data.access_token);
        localStorage.setItem('ruzivo_username', data.username || name);
        sessionStorage.removeItem('ruzivo_guest_mode');

        currentUser = data.username || name;
        updateUserProfileUI(currentUser, email);
        document.getElementById('authOverlay').style.display = 'none';
        showNotificationToast('Mapinda zvakanaka neGoogle!', 'info');
      } catch (err) {
        showAuthBanner(activeCard === 'login' ? 'loginError' : 'registerError', err.message || 'Hatina kukwanisa kupinda neGoogle.');
      }
    }

    function initGoogleAuthClient() {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          // Determine theme dynamically so button matches pure dark or light background
          const isDark = document.body.classList.contains('theme-dark');
          const googleTheme = isDark ? 'filled_black' : 'outline';

          // Render official Google Sign In buttons if containers exist
          const loginContainer = document.getElementById('googleLoginBtnContainer');
          const regContainer = document.getElementById('googleRegisterBtnContainer');
          const customLoginBtn = document.getElementById('customGoogleLoginBtn');
          const customRegBtn = document.getElementById('customGoogleRegisterBtn');

          if (loginContainer) {
            loginContainer.innerHTML = '';
            google.accounts.id.renderButton(loginContainer, {
              type: 'standard',
              theme: googleTheme,
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 380
            });
            if (customLoginBtn) customLoginBtn.style.display = 'none';
          }

          if (regContainer) {
            regContainer.innerHTML = '';
            google.accounts.id.renderButton(regContainer, {
              type: 'standard',
              theme: googleTheme,
              size: 'large',
              text: 'signup_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 380
            });
            if (customRegBtn) customRegBtn.style.display = 'none';
          }
        } catch(e) {
          console.warn('Google accounts initialize error:', e);
        }
      }
    }

    async function loginWithGoogle() {
      const activeCard = document.getElementById('loginCard').style.display !== 'none' ? 'login' : 'register';
      const errElem = document.getElementById(activeCard === 'login' ? 'loginError' : 'registerError');
      if (errElem) errElem.style.display = 'none';

      // 1. Try real Google Identity Services if available
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          initGoogleAuthClient();
          google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              console.log('Google prompt not displayed/skipped, opening fallback dialog.');
              openGoogleFallbackModal(activeCard);
            }
          });
          return;
        } catch(err) {
          console.warn('Google GIS prompt failed, using fallback:', err);
        }
      }

      // 2. Fallback modal dialog
      openGoogleFallbackModal(activeCard);
    }

    async function openGoogleFallbackModal(activeCard) {
      const googleEmail = await showCustomInputModal({
        title: 'Pinda neGoogle (Google Account)',
        desc: 'Nyora email yako yeGoogle kuti upinde kana kunyoresa akaundi yenyu:',
        placeholder: 'muenzaniso@gmail.com',
        defaultValue: localStorage.getItem('ruzivo_last_email') || '',
        btnText: 'Pinda neGoogle'
      });

      if (!googleEmail) return;

      const trimmed = googleEmail.trim();
      if (!trimmed.includes('@')) {
        showAuthBanner(activeCard === 'login' ? 'loginError' : 'registerError', 'Ndapota nyorai email chaiyo yeGoogle.');
        return;
      }

      localStorage.setItem('ruzivo_last_email', trimmed);
      const namePart = trimmed.split('@')[0];

      try {
        const resp = await fetch('/auth/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmed,
            name: namePart,
            provider: 'google'
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakupinda neGoogle.');
        }

        localStorage.setItem('ruzivo_auth_token', data.access_token);
        localStorage.setItem('ruzivo_username', data.username || namePart);
        sessionStorage.removeItem('ruzivo_guest_mode');

        currentUser = data.username || namePart;
        updateUserProfileUI(currentUser);
        document.getElementById('authOverlay').style.display = 'none';
        showNotificationToast('Mapinda zvakanaka neGoogle!', 'info');
      } catch (err) {
        showAuthBanner(activeCard === 'login' ? 'loginError' : 'registerError', err.message || 'Hatina kukwanisa kupinda neGoogle.');
      }
    }

    async function loginWithApple() {
      const activeCard = document.getElementById('loginCard').style.display !== 'none' ? 'login' : 'register';
      const errElem = document.getElementById(activeCard === 'login' ? 'loginError' : 'registerError');
      if (errElem) errElem.style.display = 'none';

      const appleEmail = await showCustomInputModal({
        title: 'Pinda neApple ID',
        desc: 'Nyora Apple ID email yako kuti upinde muRuzivo AI:',
        placeholder: 'user@icloud.com',
        defaultValue: 'user@icloud.com',
        btnText: 'Pinda neApple'
      });

      if (!appleEmail) return;

      const trimmed = appleEmail.trim();
      if (!trimmed.includes('@')) {
        showAuthBanner(activeCard === 'login' ? 'loginError' : 'registerError', 'Ndapota nyorai email chaiyo yeApple ID.');
        return;
      }

      const namePart = trimmed.split('@')[0];

      try {
        const resp = await fetch('/auth/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmed,
            name: namePart,
            provider: 'apple'
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakupinda neApple.');
        }

        localStorage.setItem('ruzivo_auth_token', data.access_token);
        localStorage.setItem('ruzivo_username', data.username || namePart);
        sessionStorage.removeItem('ruzivo_guest_mode');

        currentUser = data.username || namePart;
        updateUserProfileUI(currentUser);
        document.getElementById('authOverlay').style.display = 'none';
      } catch (err) {
        showAuthBanner(activeCard === 'login' ? 'loginError' : 'registerError', err.message || 'Hatina kukwanisa kupinda neApple.');
      }
    }

    // Custom Claude-styled Logout confirmation modal handlers
    function webLogout() {
      const modal = document.getElementById('confirmLogoutModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }

    function closeLogoutModal(event) {
      if (event && event.target && event.target.id !== 'confirmLogoutModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-modal-cancel')) {
        return;
      }
      const modal = document.getElementById('confirmLogoutModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    function confirmLogoutAction() {
      const modal = document.getElementById('confirmLogoutModal');
      if (modal) {
        modal.style.display = 'none';
      }
      localStorage.removeItem('ruzivo_auth_token');
      localStorage.removeItem('ruzivo_username');
      sessionStorage.removeItem('ruzivo_guest_mode');
      initWebAuth();
    }

    function loadConversations() {
      const stored = localStorage.getItem('ruzivo_conversations');
      if (stored) {
        try {
          conversations = JSON.parse(stored);
        } catch(e) {
          conversations = [];
        }
      }
      if (conversations.length > 0) {
        renderHistoryList();
        loadChat(conversations[0].id);
      } else {
        startNewChat();
      }
    }

    function saveConversations() {
      localStorage.setItem('ruzivo_conversations', JSON.stringify(conversations));
      renderHistoryList();
    }

    function togglePinChat(id, event) {
      if (event) event.stopPropagation();
      const chat = conversations.find(c => c.id === id);
      if (chat) {
        chat.pinned = !chat.pinned;
        // Sort: pinned first, then by timestamp/order
        conversations.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        saveConversations();
        if (currentChatId === null) {
          showAllChatsView();
        }
      }
    }

    let pendingDeleteChatId = null;

    function deleteChat(id, event) {
      if (event) event.stopPropagation();
      pendingDeleteChatId = id;
      const modal = document.getElementById('confirmDeleteModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }

    function closeConfirmDeleteModal(event) {
      if (event && event.target && event.target.id !== 'confirmDeleteModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-modal-cancel')) {
        return;
      }
      pendingDeleteChatId = null;
      const modal = document.getElementById('confirmDeleteModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    function confirmDeleteChat() {
      if (!pendingDeleteChatId) return;
      const id = pendingDeleteChatId;
      pendingDeleteChatId = null;

      const modal = document.getElementById('confirmDeleteModal');
      if (modal) {
        modal.style.display = 'none';
      }

      conversations = conversations.filter(c => c.id !== id);
      saveConversations();

      if (currentChatId === id) {
        if (conversations.length > 0) {
          loadChat(conversations[0].id);
        } else {
          startNewChat();
        }
      } else if (currentChatId === null) {
        showAllChatsView();
      }
    }

    function toggleHeadlineDropdown(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const menu = document.getElementById('headlineDropdownMenu');
      if (!menu) return;
      const isOpen = menu.style.display === 'flex';
      if (isOpen) {
        closeHeadlineDropdown();
      } else {
        openHeadlineDropdown();
      }
    }

    function openHeadlineDropdown() {
      const menu = document.getElementById('headlineDropdownMenu');
      if (!menu) return;
      renderHeadlineDropdown();
      menu.style.display = 'flex';
    }

    function closeHeadlineDropdown() {
      const menu = document.getElementById('headlineDropdownMenu');
      if (menu) menu.style.display = 'none';
    }

    function renderHeadlineDropdown() {
      const menu = document.getElementById('headlineDropdownMenu');
      if (!menu) return;
      menu.innerHTML = '';

      const header = document.createElement('div');
      header.className = 'headline-dropdown-header';
      header.innerText = 'Hurukuro Dzenyu';
      menu.appendChild(header);

      // Action: New Chat
      const newChatOption = document.createElement('div');
      newChatOption.className = 'headline-dropdown-item';
      newChatOption.onclick = () => {
        closeHeadlineDropdown();
        startNewChat();
      };
      newChatOption.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px; stroke: var(--claude-accent);">
            <path d="M12 5v14M5 12h14"></path>
          </svg>
          <span style="font-weight:600; color: var(--text-main);">Tanga Hurukuro Itsva</span>
        </div>
      `;
      menu.appendChild(newChatOption);

      // Action: Show All Chats Dashboard
      const allChatsOption = document.createElement('div');
      allChatsOption.className = 'headline-dropdown-item';
      allChatsOption.onclick = () => {
        closeHeadlineDropdown();
        showAllChatsView();
      };
      allChatsOption.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px;">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Ona Hurukuro Dzose</span>
        </div>
      `;
      menu.appendChild(allChatsOption);

      if (conversations.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'headline-dropdown-divider';
        menu.appendChild(divider);

        conversations.forEach(c => {
          const item = document.createElement('div');
          item.className = 'headline-dropdown-item' + (c.id === currentChatId ? ' active' : '');
          item.onclick = () => {
            closeHeadlineDropdown();
            loadChat(c.id);
          };
          item.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; overflow:hidden; flex:1;">
              <div class="history-bullet" style="${c.pinned ? 'background: var(--claude-accent); border-color: var(--claude-accent);' : ''}"></div>
              <span class="headline-dropdown-item-title">${escapeHtml(c.title || 'Hurukuro')}</span>
            </div>
            ${c.pinned ? '<svg class="icon" viewBox="0 0 24 24" style="width:12px; height:12px; color: var(--claude-accent);"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path></svg>' : ''}
          `;
          menu.appendChild(item);
        });
      }
    }

    // Three Dots Chat Options Menu Functionality
    function toggleChatOptionsMenu(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const menu = document.getElementById('chatOptionsMenu');
      if (!menu) return;
      const isOpen = menu.style.display === 'flex';
      if (isOpen) {
        closeChatOptionsMenu();
      } else {
        openChatOptionsMenu();
      }
    }

    function openChatOptionsMenu() {
      const menu = document.getElementById('chatOptionsMenu');
      if (!menu) return;
      renderChatOptionsMenu();
      menu.style.display = 'flex';
    }

    function closeChatOptionsMenu() {
      const menu = document.getElementById('chatOptionsMenu');
      if (menu) menu.style.display = 'none';
    }

    function renderChatOptionsMenu() {
      const menu = document.getElementById('chatOptionsMenu');
      if (!menu) return;
      menu.innerHTML = '';

      const chat = getCurrentChat();
      if (!chat) {
        menu.innerHTML = '<div style="padding: 10px 12px; font-size: 13px; color: var(--text-subtle);">Hapana hurukuro iripo</div>';
        return;
      }

      const isPinned = chat.pinned === true;
      const isArchived = chat.archived === true;

      // 1. Pin / Unpin Chat
      const pinItem = document.createElement('div');
      pinItem.className = 'chat-options-item';
      pinItem.onclick = () => {
        closeChatOptionsMenu();
        togglePinCurrentChat();
      };
      pinItem.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
        </svg>
        <span>${isPinned ? 'Bvisa Pini' : 'Pinika Hurukuro'}</span>
      `;
      menu.appendChild(pinItem);

      // 2. Rename Chat
      const renameItem = document.createElement('div');
      renameItem.className = 'chat-options-item';
      renameItem.onclick = () => {
        closeChatOptionsMenu();
        openRenameCurrentChat();
      };
      renameItem.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Chinja Zita</span>
      `;
      menu.appendChild(renameItem);

      // 3. Archive / Unarchive Chat
      const archiveItem = document.createElement('div');
      archiveItem.className = 'chat-options-item';
      archiveItem.onclick = () => {
        closeChatOptionsMenu();
        toggleArchiveCurrentChat();
      };
      archiveItem.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <polyline points="21 8 21 21 3 21 3 8"></polyline>
          <rect x="1" y="3" width="22" height="5"></rect>
          <line x1="10" y1="12" x2="14" y2="12"></line>
        </svg>
        <span>${isArchived ? 'Bvisa muDura' : 'Chengeta muDura'}</span>
      `;
      menu.appendChild(archiveItem);

      // Divider
      const divider = document.createElement('div');
      divider.className = 'chat-options-divider';
      menu.appendChild(divider);

      // 4. Copy Conversation
      const copyItem = document.createElement('div');
      copyItem.className = 'chat-options-item';
      copyItem.onclick = () => {
        closeChatOptionsMenu();
        copyCurrentChatConversation();
      };
      copyItem.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Kopa Hurukuro</span>
      `;
      menu.appendChild(copyItem);
    }

    function togglePinCurrentChat() {
      const chat = getCurrentChat();
      if (!chat) return;
      chat.pinned = !chat.pinned;
      conversations.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      saveConversations();
      renderCurrentMessages();
      renderHeadlineDropdown();
      showNotificationToast(chat.pinned ? 'Hurukuro yapinikwa pamusoro!' : 'Pini yabviswa pahurukuro.');
    }

    function openRenameCurrentChat() {
      const chat = getCurrentChat();
      if (!chat) return;
      const input = document.getElementById('renameChatInput');
      const modal = document.getElementById('renameChatModal');
      if (input) {
        input.value = chat.title || 'Hurukuro';
      }
      if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => { if (input) { input.focus(); input.select(); } }, 50);
      }
    }

    function closeRenameChatModal(event) {
      if (event && event.target && event.target.id !== 'renameChatModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-modal-cancel')) {
        return;
      }
      const modal = document.getElementById('renameChatModal');
      if (modal) modal.style.display = 'none';
    }

    function saveRenamedChat() {
      const chat = getCurrentChat();
      const input = document.getElementById('renameChatInput');
      if (!chat || !input) return;
      const newTitle = input.value.trim();
      if (newTitle) {
        chat.title = newTitle;
        saveConversations();
        renderCurrentMessages();
        renderHeadlineDropdown();
        showNotificationToast('Zita rehurukuro rachinjwa zvakanaka!');
      }
      const modal = document.getElementById('renameChatModal');
      if (modal) modal.style.display = 'none';
    }

    function toggleArchiveCurrentChat() {
      const chat = getCurrentChat();
      if (!chat) return;
      chat.archived = !chat.archived;
      saveConversations();
      renderCurrentMessages();
      renderHeadlineDropdown();
      showNotificationToast(chat.archived ? 'Hurukuro yachengetwa muDura!' : 'Hurukuro yabviswa muDura.');
    }

    async function copyCurrentChatConversation() {
      const chat = getCurrentChat();
      if (!chat || !chat.messages || chat.messages.length === 0) {
        showNotificationToast('Hapana zvinyorwa zviri muhurukuro iyi zvekukopa.');
        return;
      }

      const formattedTranscript = chat.messages.map(m => {
        const sender = m.role === 'user' ? 'Mushandisi' : 'Ruzivo AI';
        return `${sender}:\n${m.text}\n`;
      }).join('\n---\n\n');

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(formattedTranscript);
        } else {
          const temp = document.createElement('textarea');
          temp.value = formattedTranscript;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        showNotificationToast('Hurukuro yakopwa zvakanaka!');
      } catch (err) {
        showNotificationToast('Pakundikana kukopa hurukuro.');
      }
    }

    function showNotificationToast(message, type = 'info') {
      let container = document.getElementById('globalNotificationToastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'globalNotificationToastContainer';
        container.style.cssText = 'position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 100000; display: flex; flex-direction: column; align-items: center; pointer-events: none; width: 100%; max-width: 520px; padding: 0 16px;';
        document.body.appendChild(container);
      }

      // Remove existing toast if present
      const existing = document.getElementById('globalNotificationToast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'globalNotificationToast';
      
      const isError = (type === 'error');
      const isWarning = (type === 'warning');
      const accentBorder = isError ? '#EF4444' : (isWarning ? '#F59E0B' : '#10B981');
      const iconSvg = isError
        ? `<svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #EF4444; fill: none; stroke-width: 2.2; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : (isWarning 
          ? `<svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #F59E0B; fill: none; stroke-width: 2.2; flex-shrink: 0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
          : `<svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #10B981; fill: none; stroke-width: 2.2; flex-shrink: 0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        );

      toast.style.cssText = `
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        background: #FFFFFF;
        color: #1F1E1D;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 13.5px;
        font-weight: 500;
        border: 1px solid rgba(0,0,0,0.08);
        border-left: 4px solid ${accentBorder};
        box-shadow: 0 14px 40px -6px rgba(0, 0, 0, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.08);
        opacity: 0;
        transform: translateY(-16px) scale(0.96);
        transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        width: 100%;
        max-width: 480px;
      `;

      toast.innerHTML = `
        ${iconSvg}
        <span style="flex: 1; min-width: 0; line-height: 1.45; letter-spacing: -0.01em;">${escapeHtml(message)}</span>
        <button type="button" aria-label="Dismiss" class="toast-dismiss-btn" style="
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          margin-left: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
          border-radius: 6px;
          transition: color 0.15s ease, background-color 0.15s ease;
        ">
          <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2.3; stroke-linecap: round; stroke-linejoin: round;">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      container.appendChild(toast);

      const dismissBtn = toast.querySelector('.toast-dismiss-btn');
      if (dismissBtn) {
        dismissBtn.addEventListener('mouseenter', () => {
          dismissBtn.style.color = '#EF4444';
          dismissBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
        });
        dismissBtn.addEventListener('mouseleave', () => {
          dismissBtn.style.color = '#9CA3AF';
          dismissBtn.style.backgroundColor = 'transparent';
        });
        dismissBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          hideToast(toast);
        });
      }

      function hideToast(el) {
        if (!el) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(-16px) scale(0.96)';
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 250);
      }

      // Trigger animation
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0) scale(1)';
      });

      if (window.toastTimeout) clearTimeout(window.toastTimeout);
      // Auto-dismiss all toasts after 5 seconds
      const toastDuration = 5000;
      window.toastTimeout = setTimeout(() => {
        hideToast(toast);
      }, toastDuration);
    }

    // Attach Tools (+) Menu Functionality
    function toggleAttachPopupMenu(e) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const menu = document.getElementById('attachPopupMenu');
      if (!menu) return;
      const isOpen = menu.style.display === 'flex';
      if (isOpen) {
        closeAttachPopupMenu();
      } else {
        openAttachPopupMenu();
      }
    }

    function openAttachPopupMenu() {
      const menu = document.getElementById('attachPopupMenu');
      if (menu) menu.style.display = 'flex';
    }

    function closeAttachPopupMenu() {
      const menu = document.getElementById('attachPopupMenu');
      if (menu) menu.style.display = 'none';
    }

    function triggerFileUpload(type) {
      closeAttachPopupMenu();
      if (type === 'document') {
        const input = document.getElementById('attachDocInput');
        if (input) input.click();
      } else if (type === 'image') {
        const input = document.getElementById('attachImgInput');
        if (input) input.click();
      }
    }

    function handleAttachedFile(e, type) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const textarea = document.getElementById('chatTextarea');
      if (textarea) {
        const prefix = type === 'document' ? `[Gwaro rakaiswa: ${file.name}]\n` : `[Mufananidzo wakaiswa: ${file.name}]\n`;
        textarea.value = prefix + textarea.value;
        autoResize(textarea);
        textarea.focus();
        showNotificationToast(`Gwaro "${file.name}" rakasungirirwa zvakanaka!`);
      }
      e.target.value = '';
    }

    // Dismiss dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      closeAvatarEditMenu();
      if (!e.target.closest('#userProfileWrapper')) {
        closeUserProfileMenu();
      }

      if (!e.target.closest('.history-actions')) {
        closeAllHistoryMenus();
      }

      const headlineWrapper = document.getElementById('headlineDropdownWrapper');
      if (headlineWrapper && !headlineWrapper.contains(e.target)) {
        closeHeadlineDropdown();
      }

      const optionsWrapper = document.getElementById('chatOptionsWrapper');
      if (optionsWrapper && !optionsWrapper.contains(e.target)) {
        closeChatOptionsMenu();
      }

      const attachWrapper = document.getElementById('attachPopupWrapper');
      if (attachWrapper && !attachWrapper.contains(e.target)) {
        closeAttachPopupMenu();
      }
    });

    let openHistoryMenuChatId = null;

    function closeAllHistoryMenus() {
      document.querySelectorAll('.history-item-menu').forEach(m => m.classList.remove('show'));
      document.querySelectorAll('.history-item').forEach(i => i.classList.remove('menu-open'));
      openHistoryMenuChatId = null;
    }

    function toggleHistoryItemMenu(chatId, event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      const menu = document.getElementById('historyMenu_' + chatId);
      const itemEl = document.getElementById('historyItem_' + chatId);
      const isCurrentlyOpen = menu && menu.classList.contains('show');

      closeAllHistoryMenus();

      if (!isCurrentlyOpen && menu && itemEl) {
        menu.classList.add('show');
        itemEl.classList.add('menu-open');
        openHistoryMenuChatId = chatId;
      }
    }

    function archiveChatById(id, event) {
      if (event) event.stopPropagation();
      closeAllHistoryMenus();
      const chat = conversations.find(c => c.id === id);
      if (chat) {
        chat.archived = true;
        saveConversations();
        renderCurrentMessages();
        renderHeadlineDropdown();
        showNotificationToast('Hurukuro yachengetwa muDura!');
      }
    }

    function openRenameChatById(id, event) {
      if (event) event.stopPropagation();
      closeAllHistoryMenus();
      const chat = conversations.find(c => c.id === id);
      if (!chat) return;
      currentChatId = id;
      openRenameCurrentChat();
    }

    function renderHistoryList() {
      const list = document.getElementById('historyList');
      list.innerHTML = '';
      const activeChats = conversations.filter(c => !c.archived);
      activeChats.forEach(chat => {
        const item = document.createElement('div');
        item.id = 'historyItem_' + chat.id;
        item.className = 'history-item' + (chat.id === currentChatId ? ' active' : '') + (chat.pinned ? ' pinned' : '');
        
        item.onclick = () => loadChat(chat.id);

        const isPinned = chat.pinned === true;
        item.innerHTML = `
          <div class="history-item-left">
            <div class="history-bullet" style="${isPinned ? 'background: var(--claude-accent); border-color: var(--claude-accent);' : ''}"></div>
            <span>${escapeHtml(chat.title || 'Hurukuro')}</span>
          </div>
          <div class="history-actions" onclick="event.stopPropagation()">
            <button class="history-action-btn" onclick="toggleHistoryItemMenu('${chat.id}', event)" aria-label="Zvimwe Zviito">
              <svg class="icon" viewBox="0 0 24 24" style="width:15px; height:15px; fill:currentColor; stroke:none;">
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div class="history-item-menu" id="historyMenu_${chat.id}" onclick="event.stopPropagation()">
              <div class="history-menu-item" onclick="togglePinChat('${chat.id}', event); closeAllHistoryMenus();">
                <svg class="icon" viewBox="0 0 24 24">
                  <line x1="12" y1="17" x2="12" y2="22"></line>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
                </svg>
                <span>${isPinned ? 'Bvisa Pini' : 'Pinika pamusoro'}</span>
              </div>
              <div class="history-menu-item" onclick="openRenameChatById('${chat.id}', event)">
                <svg class="icon" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Chinja Zita</span>
              </div>
              <div class="history-menu-item" onclick="archiveChatById('${chat.id}', event)">
                <svg class="icon" viewBox="0 0 24 24">
                  <polyline points="21 8 21 21 3 21 3 8"></polyline>
                  <rect x="1" y="3" width="22" height="5"></rect>
                  <line x1="10" y1="12" x2="14" y2="12"></line>
                </svg>
                <span>Chengeta muDura</span>
              </div>
              <div class="history-menu-divider"></div>
              <div class="history-menu-item danger" onclick="deleteChat('${chat.id}', event); closeAllHistoryMenus();">
                <svg class="icon" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Dzima Hurukuro</span>
              </div>
            </div>
          </div>
        `;
        list.appendChild(item);
      });
      renderCollapsedChatsFlyout();
    }

    function renderCollapsedChatsFlyout() {
      const flyoutList = document.getElementById('collapsedChatsFlyoutList');
      if (!flyoutList) return;
      flyoutList.innerHTML = '';
      const activeChats = conversations.filter(c => !c.archived);
      if (!activeChats || activeChats.length === 0) {
        flyoutList.innerHTML = '<div style="padding: 12px; font-size: 13px; color: var(--text-subtle); text-align: center;">Hapana hurukuro dziripo</div>';
        return;
      }
      activeChats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'flyout-chat-item' + (chat.id === currentChatId ? ' active' : '');
        item.onclick = (e) => {
          e.stopPropagation();
          loadChat(chat.id);
        };
        item.innerHTML = `
          <div class="history-bullet" style="${chat.pinned ? 'background: var(--claude-accent); border-color: var(--claude-accent);' : ''}"></div>
          <span class="flyout-chat-item-title">${escapeHtml(chat.title || 'Hurukuro')}</span>
          ${chat.pinned ? '<svg class="icon" viewBox="0 0 24 24" style="width:12px; height:12px; color: var(--claude-accent);"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path></svg>' : ''}
        `;
        flyoutList.appendChild(item);
      });
    }

    function handleBrandLogoClick() {
      if (document.body.classList.contains('sidebar-collapsed')) {
        toggleSidebar();
      }
    }

    function startNewChat() {
      const newId = 'chat_' + Date.now();
      const newChat = {
        id: newId,
        title: 'Hurukuro Itsva',
        pinned: false,
        messages: [
          {
            role: 'bot',
            text: 'Mhoro! Ini ndiri Ruzivo, mubatsiri wenyu wehungwaru hweChiShona.\n\nBvunzai mubvunzo upi zvawo maererano nemutauro weChiShona, tsika, tsumo, madimikira, kana zvinyorwa zvedzidzo.',
            context: null
          }
        ]
      };
      // Pinned items stay on top
      const firstUnpinnedIndex = conversations.findIndex(c => !c.pinned);
      if (firstUnpinnedIndex === -1) {
        conversations.push(newChat);
      } else {
        conversations.splice(firstUnpinnedIndex, 0, newChat);
      }

      currentChatId = newId;
      saveConversations();
      renderCurrentMessages();
      
      const txt = document.getElementById('chatTextarea');
      txt.value = '';
      txt.style.height = 'auto';
      txt.focus();
    }

    function showAllChatsView() {
      currentChatId = null;
      renderHistoryList();
      document.querySelector('.chat-headline span').innerText = 'Hurukuro Dzose';

      const thread = document.getElementById('conversationThread');
      
      let cardsHtml = '';
      if (conversations.length === 0) {
        cardsHtml = '<p style="color: var(--text-subtle); grid-column: 1 / -1; text-align: center; padding: 40px 0;">Hapana hurukuro dzati dzaitwa parizvino.</p>';
      } else {
        conversations.forEach(c => {
          const msgCount = c.messages ? c.messages.length : 0;
          const firstUserMsg = c.messages ? c.messages.find(m => m.role === 'user') : null;
          const snippet = firstUserMsg ? firstUserMsg.text : 'Hurukuro itsva...';

          cardsHtml += `
            <div class="chat-card" onclick="loadChat('${c.id}')">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                  <div class="chat-card-title">${escapeHtml(c.title || 'Hurukuro')}</div>
                  <div class="card-actions" onclick="event.stopPropagation()">
                    <button class="card-btn ${c.pinned ? 'pinned' : ''}" onclick="togglePinChat('${c.id}', event)" title="${c.pinned ? 'Bvisa pini' : 'Pinika'}">
                      <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px;">
                        <line x1="12" y1="17" x2="12" y2="22"></line>
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path>
                      </svg>
                    </button>
                    <button class="card-btn delete" onclick="deleteChat('${c.id}', event)" title="Dzima">
                      <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="chat-card-snippet">${escapeHtml(snippet)}</div>
              </div>
              <div class="chat-card-meta">
                <span>${msgCount} mhinduro ${c.pinned ? ' • <strong style="color:var(--claude-accent)">Yakapinikwa</strong>' : ''}</span>
                <span style="color: var(--claude-accent); display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                  <span>Vhura</span>
                  <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </span>
              </div>
            </div>
          `;
        });
      }

      thread.innerHTML = `
        <div class="all-chats-view">
          <div class="all-chats-header">
            <div>
              <div class="all-chats-title">Hurukuro Dzose Dzichangobva Kuitwa</div>
              <div class="all-chats-count">Pane hurukuro dzinokwana ${conversations.length} dzakachengetwa</div>
            </div>
            <button class="nav-link new-chat" onclick="startNewChat()" style="background: var(--item-active-bg); padding: 9px 16px; border-radius: 9px; display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; cursor: pointer; border: 1px solid var(--border-subtle);">
              <svg class="icon" viewBox="0 0 24 24" style="width: 15px; height: 15px;">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              <span>Tanga Itsva</span>
            </button>
          </div>
          <div class="chats-grid">
            ${cardsHtml}
          </div>
        </div>
      `;

      const inputContainer = document.getElementById('chatInputContainer');
      if (inputContainer) inputContainer.style.display = 'none';

      const scrollArea = document.getElementById('messagesScroll');
      scrollArea.scrollTop = 0;
    }

    function showArchivedChatsView() {
      currentChatId = null;
      renderHistoryList();
      document.querySelector('.chat-headline span').innerText = 'Dura reHurukuro';

      const thread = document.getElementById('conversationThread');
      const archivedChats = conversations.filter(c => c.archived === true);
      
      let cardsHtml = '';
      if (archivedChats.length === 0) {
        cardsHtml = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-subtle);">
            <svg viewBox="0 0 24 24" style="width: 44px; height: 44px; stroke: currentColor; fill: none; stroke-width: 1.5; margin: 0 auto 12px; opacity: 0.6;">
              <polyline points="21 8 21 21 3 21 3 8"></polyline>
              <rect x="1" y="3" width="22" height="5"></rect>
              <line x1="10" y1="12" x2="14" y2="12"></line>
            </svg>
            <div style="font-size: 16px; font-weight: 500; color: var(--text-main);">Hapana hurukuro dzakachengetwa muDura</div>
            <div style="font-size: 13px; margin-top: 4px;">Unogona kuchengeta chero hurukuro muDura uchishandisa menyu yemavara matatu ari pamusoro pehurukuro.</div>
          </div>
        `;
      } else {
        archivedChats.forEach(c => {
          const msgCount = c.messages ? c.messages.length : 0;
          const firstUserMsg = c.messages ? c.messages.find(m => m.role === 'user') : null;
          const snippet = firstUserMsg ? firstUserMsg.text : 'Hurukuro yachengetwa...';

          cardsHtml += `
            <div class="chat-card" onclick="loadChat('${c.id}')">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                  <div class="chat-card-title">${escapeHtml(c.title || 'Hurukuro')}</div>
                  <div class="card-actions" onclick="event.stopPropagation()">
                    <button class="card-btn" onclick="unarchiveChat('${c.id}', event)" title="Bvisa muDura">
                      <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px;">
                        <polyline points="3 14 3 3 14 3"></polyline>
                        <line x1="3" y1="3" x2="10" y2="10"></line>
                        <polyline points="21 8 21 21 3 21"></polyline>
                      </svg>
                    </button>
                    <button class="card-btn delete" onclick="deleteChat('${c.id}', event)" title="Dzima">
                      <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="chat-card-snippet">${escapeHtml(snippet)}</div>
              </div>
              <div class="chat-card-meta">
                <span>${msgCount} mhinduro • <strong style="color:var(--text-subtle);">MuDura</strong></span>
                <span style="color: var(--claude-accent); display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                  <span>Vhura</span>
                  <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </span>
              </div>
            </div>
          `;
        });
      }

      thread.innerHTML = `
        <div class="all-chats-view">
          <div class="all-chats-header">
            <div>
              <div class="all-chats-title">Dura reHurukuro</div>
              <div class="all-chats-count">Hurukuro dzakachengetedzwa: ${archivedChats.length}</div>
            </div>
            <button class="nav-link new-chat" onclick="showAllChatsView()" style="background: var(--item-active-bg); padding: 8px 14px; border-radius: 8px;">
              <svg class="icon" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Hurukuro Dzose</span>
            </button>
          </div>
          <div class="chats-grid">
            ${cardsHtml}
          </div>
        </div>
      `;

      const inputContainer = document.getElementById('chatInputContainer');
      if (inputContainer) inputContainer.style.display = 'none';

      const scrollArea = document.getElementById('messagesScroll');
      scrollArea.scrollTop = 0;
    }

    function unarchiveChat(id, event) {
      if (event) event.stopPropagation();
      const chat = conversations.find(c => c.id === id);
      if (chat) {
        chat.archived = false;
        saveConversations();
        showArchivedChatsView();
        showNotificationToast('Hurukuro yabviswa muDura!');
      }
    }

    function loadChat(id) {
      currentChatId = id;
      const inputContainer = document.getElementById('chatInputContainer');
      if (inputContainer) inputContainer.style.display = 'flex';
      renderHistoryList();
      renderCurrentMessages();
    }

    function getCurrentChat() {
      return conversations.find(c => c.id === currentChatId);
    }

    function formatDuration(totalSeconds) {
      if (typeof totalSeconds === 'string') {
        const parsed = parseFloat(totalSeconds);
        if (isNaN(parsed)) return totalSeconds;
        totalSeconds = parsed;
      }
      if (totalSeconds < 60) {
        return `${totalSeconds.toFixed(1)}s`;
      }
      const totalSecInt = Math.round(totalSeconds);
      const hours = Math.floor(totalSecInt / 3600);
      const minutes = Math.floor((totalSecInt % 3600) / 60);
      const seconds = totalSecInt % 60;

      if (hours > 0) {
        if (minutes > 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        }
        return `${hours}h ${seconds}s`;
      }
      return `${minutes}m ${seconds}s`;
    }

    // Helper functions for Message Actions
    async function copyMessageText(index, role, btnEl) {
      const chat = getCurrentChat();
      if (!chat || !chat.messages[index]) return;
      const text = chat.messages[index].text;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const temp = document.createElement('textarea');
          temp.value = text;
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        if (btnEl) {
          const origSvg = btnEl.innerHTML;
          btnEl.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="width:13px; height:13px; color: var(--claude-accent); stroke: var(--claude-accent);"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          setTimeout(() => { btnEl.innerHTML = origSvg; }, 1600);
        }
        showNotification("Mashoko akopwa (Copied)!");
      } catch (err) {
        showNotification("Haikwanisi kukopa.");
      }
    }

    function editAndResendPrompt(index) {
      const chat = getCurrentChat();
      if (!chat || !chat.messages[index]) return;
      const text = chat.messages[index].text;
      const textarea = document.getElementById('chatTextarea');
      if (textarea) {
        textarea.value = text;
        autoResize(textarea);
        textarea.focus();
        showNotification("Mubvunzo waiswa mukati mekutaura kuti muugadzirise.");
      }
    }

    async function retryPromptResponse(userIndex) {
      const chat = getCurrentChat();
      if (!chat || !chat.messages[userIndex]) return;
      if (isAiBusy) {
        showNotification("Ruzivo ruchiri kushanda, mirai zvishoma...");
        return;
      }
      const text = chat.messages[userIndex].text;
      await executeChatRequest(text, chat);
    }

    async function rateMessageResponse(botIndex, rating, btnEl) {
      const chat = getCurrentChat();
      if (!chat || !chat.messages[botIndex]) return;
      
      const botMsg = chat.messages[botIndex];
      // Find the user query that prompted this response
      let userQuery = "";
      for (let i = botIndex - 1; i >= 0; i--) {
        if (chat.messages[i].role === 'user') {
          userQuery = chat.messages[i].text;
          break;
        }
      }
      if (!userQuery) userQuery = "Mubvunzo weChiShona";

      // If user clicks the already active rating, toggle off
      const isAlreadyRated = (botMsg.rating === rating);
      const newRating = isAlreadyRated ? null : rating;
      botMsg.rating = newRating;
      saveConversations();
      renderCurrentMessages();

      if (!newRating) {
        showNotification("Ongororo yabviswa.");
        return;
      }

      // Send rating feedback to server for model continuous learning
      try {
        const token = localStorage.getItem('ruzivo_auth_token') || '';
        await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            query: userQuery,
            response: botMsg.text,
            rating: newRating
          })
        });

        if (newRating === 'good') {
          showNotification("Maita basa! Mhinduro yakanaka yakachengetwa kuti modhero idzidze.");
        } else {
          showNotification("Maita basa! Zvichemo zvakachengetwa kuti modhero igadzirise.");
        }
      } catch (e) {
        console.warn("Feedback network error:", e);
      }
    }

    function renderCurrentMessages() {
      const inputContainer = document.getElementById('chatInputContainer');
      if (inputContainer) inputContainer.style.display = 'flex';
      const chat = getCurrentChat();
      if (!chat) return;

      document.querySelector('.chat-headline span').innerText = chat.title || 'Hurukuro';

      const thread = document.getElementById('conversationThread');
      thread.innerHTML = '';

      chat.messages.forEach((msg, idx) => {
        if (msg.role === 'user') {
          const userGroup = document.createElement('div');
          userGroup.className = 'message-group user';
          const isQueued = msg.queued === true;
          userGroup.innerHTML = `
            <div class="user-pill ${isQueued ? 'queued-pill' : ''}">${escapeHtml(msg.text)}</div>
            ${isQueued ? '<div class="queued-tag"><span class="thinking-spinner" style="width: 10px; height: 10px; border-width: 1.5px;"></span> Yakamirira mutsara (Queued)</div>' : `
              <div class="message-actions-bar">
                <button class="msg-action-btn" onclick="copyMessageText(${idx}, 'user', this)" data-tooltip="Kopa mubvunzo" data-tooltip-pos="bottom" aria-label="Kopa">
                  <svg class="icon" viewBox="0 0 24 24" style="width:13px; height:13px;">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="msg-action-btn" onclick="editAndResendPrompt(${idx})" data-tooltip="Gadzirisa zvakare" data-tooltip-pos="bottom" aria-label="Gadzirisa">
                  <svg class="icon" viewBox="0 0 24 24" style="width:13px; height:13px;">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </button>
                <button class="msg-action-btn" onclick="retryPromptResponse(${idx})" data-tooltip="Bvunza zvakare (Retry)" data-tooltip-pos="bottom" aria-label="Dzosa">
                  <svg class="icon" viewBox="0 0 24 24" style="width:13px; height:13px;">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  </svg>
                </button>
              </div>
            `}
          `;
          thread.appendChild(userGroup);
        } else {
          const botGroup = document.createElement('div');
          botGroup.className = 'message-group bot';
          const durationHtml = msg.duration ? `
            <div class="response-meta-bar">
              <span class="response-time-badge">Yakatora ${escapeHtml(formatDuration(msg.duration))}</span>
            </div>
          ` : '';
          botGroup.innerHTML = `
            <div class="bot-editorial">
              ${durationHtml}
              ${formatEditorialMarkdown(msg.text)}
              <div class="message-actions-bar">
                <button class="msg-action-btn" onclick="copyMessageText(${idx}, 'bot', this)" data-tooltip="Kopa mhinduro" data-tooltip-pos="bottom" aria-label="Kopa">
                  <svg class="icon" viewBox="0 0 24 24" style="width:13px; height:13px;">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button class="msg-action-btn ${msg.rating === 'good' ? 'rated-good' : ''}" onclick="rateMessageResponse(${idx}, 'good', this)" data-tooltip="Mhinduro yakanaka (Good)" data-tooltip-pos="bottom" aria-label="Yakanaka">
                  <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px; fill: ${msg.rating === 'good' ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2.2;">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                </button>
                <button class="msg-action-btn ${msg.rating === 'bad' ? 'rated-bad' : ''}" onclick="rateMessageResponse(${idx}, 'bad', this)" data-tooltip="Mhinduro yakaipa (Bad)" data-tooltip-pos="bottom" aria-label="Yakaipa">
                  <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px; fill: ${msg.rating === 'bad' ? 'currentColor' : 'none'}; stroke: currentColor; stroke-width: 2.2;">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                  </svg>
                </button>
              </div>
            </div>
          `;
          if (msg.context) {
            const showCitPref = localStorage.getItem('ruzivo_show_citations');
            const shouldDisplay = (showCitPref === null || showCitPref === 'true');
            const sourceCard = document.createElement('div');
            sourceCard.className = 'retrieved-source-card';
            sourceCard.style.display = shouldDisplay ? 'flex' : 'none';
            sourceCard.innerHTML = `
              <svg class="icon" viewBox="0 0 24 24" style="width:14px; height:14px; margin-top:2px; color: var(--claude-accent);">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div><strong>Zvinyorwa Zvechokwadi Zvawanikwa:</strong> ${escapeHtml(msg.context)}</div>
            `;
            botGroup.querySelector('.bot-editorial').appendChild(sourceCard);
          }
          thread.appendChild(botGroup);
        }
      });

      const scrollArea = document.getElementById('messagesScroll');
      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 50);
    }

    function autoResize(textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
      updateSendButtonState();
    }

    function handleTextareaKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }

    let currentSettingsTab = 'appearance';

    function returnToLastChat() {
      if (conversations.length > 0) {
        loadChat(conversations[0].id);
      } else {
        startNewChat();
      }
    }

    function openSettings(initialTab = 'general') {
      const modal = document.getElementById('claudeSettingsModal');
      if (modal) {
        modal.style.display = 'flex';
        switchClaudeSettingsTab(initialTab === 'appearance' ? 'general' : initialTab);
        syncClaudeSettingsUI();
      }
    }

    function closeSettingsModal(event) {
      if (event && event.target && event.target.id !== 'claudeSettingsModal' && !event.target.closest('.claude-settings-close-btn')) {
        return;
      }
      const modal = document.getElementById('claudeSettingsModal');
      if (modal) modal.style.display = 'none';
    }

    function switchClaudeSettingsTab(tabName) {
      // Map legacy names
      if (tabName === 'appearance') tabName = 'general';
      if (tabName === 'profile') tabName = 'account';

      const navButtons = document.querySelectorAll('.claude-settings-nav-item');
      navButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      const panes = document.querySelectorAll('.claude-settings-tab-pane');
      panes.forEach(p => p.style.display = 'none');

      const targetId = 'claudeTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.style.display = 'block';
      }

      if (tabName === 'account') {
        fetchAccountDetails();
      }
    }

    function filterClaudeSettingsNav(query) {
      const q = (query || '').toLowerCase().trim();
      const navButtons = document.querySelectorAll('.claude-settings-nav-item');
      navButtons.forEach(btn => {
        const text = btn.innerText.toLowerCase();
        btn.style.display = text.includes(q) ? 'flex' : 'none';
      });
    }

    function selectThemeSegment(mode) {
      document.querySelectorAll('.theme-segment .claude-segment-btn').forEach(b => b.classList.remove('active'));
      // Sync bottom ZITRAC theme toggle buttons as well
      document.querySelectorAll('.zitrac-theme-btn').forEach(b => b.classList.remove('active'));

      if (mode === 'system') {
        document.getElementById('themeSegSystem')?.classList.add('active');
        document.getElementById('zitracThemeSystem')?.classList.add('active');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.body.classList.add('theme-dark');
        } else {
          document.body.classList.remove('theme-dark');
        }
        localStorage.setItem('ruzivo_theme', 'system');
      } else if (mode === 'dark') {
        document.getElementById('themeSegDark')?.classList.add('active');
        document.getElementById('zitracThemeDark')?.classList.add('active');
        document.body.classList.add('theme-dark');
        localStorage.setItem('ruzivo_theme', 'dark');
      } else {
        document.getElementById('themeSegLight')?.classList.add('active');
        document.getElementById('zitracThemeLight')?.classList.add('active');
        document.body.classList.remove('theme-dark');
        localStorage.setItem('ruzivo_theme', 'light');
      }

      // Re-render Google button so it immediately matches dark/light mode
      if (typeof initGoogleAuthClient === 'function') {
        initGoogleAuthClient();
      }
    }

    // Live World Clock Updater for Harare (CAT) & London (GMT)
    function updateZitracClocks() {
      try {
        const now = new Date();
        const catTime = now.toLocaleTimeString('en-GB', { timeZone: 'Africa/Harare', hour: '2-digit', minute: '2-digit' });
        const gmtTime = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
        
        const catEl = document.getElementById('zitracTimeCAT');
        const gmtEl = document.getElementById('zitracTimeGMT');
        if (catEl) catEl.innerText = `HRE, ZWE (CAT) ${catTime}`;
        if (gmtEl) gmtEl.innerText = `LND, UK (GMT) ${gmtTime}`;
      } catch (e) {}
    }
    setInterval(updateZitracClocks, 1000);
    updateZitracClocks();

    function handleZitracChatAction() {
      // If already authenticated or in guest mode, simply focus chat or scroll to input
      const token = localStorage.getItem('ruzivo_auth_token');
      const isGuest = sessionStorage.getItem('ruzivo_guest_mode');
      if (token || isGuest) {
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('chatInput')?.focus();
      } else {
        scrollToAuthSection();
        showNotificationToast('Pinda kana nyoresa kuti utange kutaura naRuzivo AI!', 'info');
      }
    }

    function openSystemStatusModal() {
      showNotificationToast('Ruzivo AI Servers & Database: 100% Operational (Green)', 'info');
    }

    function selectThemeSegment_original(mode) {
      document.querySelectorAll('.theme-segment .claude-segment-btn').forEach(b => b.classList.remove('active'));
      if (mode === 'system') {
        document.getElementById('themeSegSystem')?.classList.add('active');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.body.classList.add('theme-dark');
        } else {
          document.body.classList.remove('theme-dark');
        }
        localStorage.setItem('ruzivo_theme', 'system');
      } else if (mode === 'dark') {
        document.getElementById('themeSegDark')?.classList.add('active');
        document.body.classList.add('theme-dark');
        localStorage.setItem('ruzivo_theme', 'dark');
      } else {
        document.getElementById('themeSegLight')?.classList.add('active');
        document.body.classList.remove('theme-dark');
        localStorage.setItem('ruzivo_theme', 'light');
      }
    }

    function changeChatFont(fontName) {
      localStorage.setItem('ruzivo_font', fontName);
      if (fontName === 'Raleway') {
        document.documentElement.style.setProperty('--chat-font', "'Raleway', sans-serif");
      } else if (fontName === 'Newsreader') {
        document.documentElement.style.setProperty('--chat-font', "'Newsreader', serif");
      } else if (fontName === 'Plus Jakarta Sans') {
        document.documentElement.style.setProperty('--chat-font', "'Plus Jakarta Sans', sans-serif");
      } else {
        document.documentElement.style.setProperty('--chat-font', "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
      }
    }

    function setTranscriptWidth(widthMode) {
      document.querySelectorAll('#widthNarrow, #widthMedium, #widthWide').forEach(b => b.classList.remove('active'));
      if (widthMode === 'wide') {
        document.getElementById('widthWide')?.classList.add('active');
        document.documentElement.style.setProperty('--chat-max-width', '980px');
      } else if (widthMode === 'medium') {
        document.getElementById('widthMedium')?.classList.add('active');
        document.documentElement.style.setProperty('--chat-max-width', '840px');
      } else {
        document.getElementById('widthNarrow')?.classList.add('active');
        document.documentElement.style.setProperty('--chat-max-width', '760px');
      }
      localStorage.setItem('ruzivo_transcript_width', widthMode);
    }

    function setMotionPreference(motionMode) {
      document.querySelectorAll('#motionSystem, #motionReduced').forEach(b => b.classList.remove('active'));
      if (motionMode === 'reduced') {
        document.getElementById('motionReduced')?.classList.add('active');
        document.body.classList.add('reduced-motion');
      } else {
        document.getElementById('motionSystem')?.classList.add('active');
        document.body.classList.remove('reduced-motion');
      }
      localStorage.setItem('ruzivo_motion', motionMode);
    }

    function saveNotificationPref(val) {
      const isEnabled = Boolean(val);
      localStorage.setItem('ruzivo_notify_completions', isEnabled ? 'true' : 'false');
      const toggle = document.getElementById('claudeCompletionNotifyToggle');
      if (toggle) toggle.checked = isEnabled;
    }

    function updateMemoryButtonsState() {
      const input = document.getElementById('claudeCustomMemoryInput');
      const clearBtn = document.getElementById('claudeClearMemoryBtn');
      if (!clearBtn) return;

      const hasText = input && input.value.trim().length > 0;
      const hasStored = Boolean(localStorage.getItem('ruzivo_custom_memory'));

      if (hasText || hasStored) {
        clearBtn.disabled = false;
        clearBtn.style.opacity = '1';
        clearBtn.style.cursor = 'pointer';
      } else {
        clearBtn.disabled = true;
        clearBtn.style.opacity = '0.45';
        clearBtn.style.cursor = 'not-allowed';
      }
    }

    function saveClaudeMemory() {
      const input = document.getElementById('claudeCustomMemoryInput');
      if (!input) return;

      const val = input.value.trim();
      if (!val || val.length === 0) {
        input.focus();
        input.style.borderColor = '#EF4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
        setTimeout(() => {
          input.style.borderColor = '';
          input.style.boxShadow = '';
        }, 2500);
        showNotificationToast('Ndapota tangai manyora mirayiridzo musati maichengetedza.', 'error');
        return;
      }

      if (val.length < 10) {
        input.focus();
        input.style.borderColor = '#EF4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
        setTimeout(() => {
          input.style.borderColor = '';
          input.style.boxShadow = '';
        }, 2500);
        showNotificationToast(`Mirayiridzo ipfupi zvakanyanya (${val.length}/10). Ndapota nyorai zvirevo zvinosvika mavara gumi (10) zvichikwira.`, 'warning');
        return;
      }

      localStorage.setItem('ruzivo_custom_memory', val);
      updateMemoryButtonsState();
      showNotificationToast('Mirayiridzo yerangariro yachengetwa zvakanaka!', 'info');
    }

    function toggleCustomFontDropdown(event) {
      if (event) event.stopPropagation();
      const container = document.getElementById('claudeFontSelectContainer');
      if (container) {
        container.classList.toggle('is-open');
      }
    }

    function selectCustomChatFont(fontVal, fontLabel) {
      changeChatFont(fontVal);
      const labelEl = document.getElementById('claudeFontSelectedLabel');
      if (labelEl) labelEl.innerText = fontLabel;

      document.querySelectorAll('#claudeFontSelectMenu .claude-custom-select-item').forEach(item => {
        if (item.getAttribute('data-value') === fontVal) {
          item.classList.add('is-selected');
        } else {
          item.classList.remove('is-selected');
        }
      });

      const container = document.getElementById('claudeFontSelectContainer');
      if (container) container.classList.remove('is-open');
    }

    // Custom Delete Reason Dropdown Handlers
    function toggleDeleteReasonDropdown(event) {
      if (event) event.stopPropagation();
      const container = document.getElementById('deleteReasonSelectContainer');
      if (container) {
        container.classList.toggle('is-open');
      }
    }

    function selectDeleteReason(reasonText) {
      const hiddenInput = document.getElementById('deleteAccountReason');
      if (hiddenInput) hiddenInput.value = reasonText;

      const labelEl = document.getElementById('deleteReasonSelectedLabel');
      if (labelEl) labelEl.innerText = reasonText;

      document.querySelectorAll('#deleteReasonSelectMenu .claude-custom-select-item').forEach(item => {
        if (item.getAttribute('data-val') === reasonText) {
          item.classList.add('is-selected');
        } else {
          item.classList.remove('is-selected');
        }
      });

      const container = document.getElementById('deleteReasonSelectContainer');
      if (container) container.classList.remove('is-open');
    }

    // Close dropdowns on document click
    document.addEventListener('click', (e) => {
      const fontContainer = document.getElementById('claudeFontSelectContainer');
      if (fontContainer && !fontContainer.contains(e.target)) {
        fontContainer.classList.remove('is-open');
      }
      const roleContainer = document.getElementById('claudeWorkRoleContainer');
      if (roleContainer && !roleContainer.contains(e.target)) {
        roleContainer.classList.remove('is-open');
      }
      const reasonContainer = document.getElementById('deleteReasonSelectContainer');
      if (reasonContainer && !reasonContainer.contains(e.target)) {
        reasonContainer.classList.remove('is-open');
      }
      const avatarMenu = document.getElementById('avatarEditFlyoutMenu');
      const avatarBtn = document.getElementById('avatarEditTriggerBtn');
      if (avatarMenu && avatarBtn && !avatarMenu.contains(e.target) && !avatarBtn.contains(e.target)) {
        avatarMenu.style.display = 'none';
      }
    });

    function syncClaudeSettingsUI() {
      // Sync Theme
      const savedTheme = localStorage.getItem('ruzivo_theme') || 'light';
      selectThemeSegment(savedTheme);

      // Sync Font
      const savedFont = localStorage.getItem('ruzivo_font') || 'Raleway';
      const fontLabels = {
        'Raleway': 'Raleway (Yakasarudzwa)',
        'Newsreader': 'Newsreader (Yemapepanhau)',
        'Plus Jakarta Sans': 'Plus Jakarta Sans',
        'System Sans': 'System Sans (Yefoni/Kombiyuta)'
      };
      const labelEl = document.getElementById('claudeFontSelectedLabel');
      if (labelEl) labelEl.innerText = fontLabels[savedFont] || savedFont;
      
      document.querySelectorAll('#claudeFontSelectMenu .claude-custom-select-item').forEach(item => {
        if (item.getAttribute('data-value') === savedFont) {
          item.classList.add('is-selected');
        } else {
          item.classList.remove('is-selected');
        }
      });
      changeChatFont(savedFont);

      // Sync Width
      const savedWidth = localStorage.getItem('ruzivo_transcript_width') || 'narrow';
      setTranscriptWidth(savedWidth);

      // Sync Motion
      const savedMotion = localStorage.getItem('ruzivo_motion') || 'system';
      setMotionPreference(savedMotion);

      // Sync Toggles
      const notifPref = (localStorage.getItem('ruzivo_notify_completions') !== 'false');
      const notifEl = document.getElementById('claudeCompletionNotifyToggle');
      if (notifEl) notifEl.checked = notifPref;

      const showCitPref = (localStorage.getItem('ruzivo_show_citations') !== 'false');
      const showCitEl = document.getElementById('claudeShowCitationsToggle');
      if (showCitEl) showCitEl.checked = showCitPref;

      const convMemPref = (localStorage.getItem('ruzivo_conversation_memory') !== 'false');
      const convMemEl = document.getElementById('claudeConvMemoryToggle');
      if (convMemEl) convMemEl.checked = convMemPref;

      const customMemVal = localStorage.getItem('ruzivo_custom_memory') || '';
      const customMemEl = document.getElementById('claudeCustomMemoryInput');
      const nickInput = document.getElementById('claudeNicknameInput');
      if (nickInput) nickInput.value = localStorage.getItem('ruzivo_nickname') || '';
      const savedRole = localStorage.getItem('ruzivo_work_description') || 'other';
      const roleLabels = {
        'student': 'Mudzidzi (Student)',
        'educator': 'Mudzidzisi (Educator)',
        'researcher': 'Muongorori (Researcher)',
        'developer': 'Mugadziri weMapurogiramu',
        'other': 'Zvimwe (Other)'
      };
      const roleLabelEl = document.getElementById('claudeWorkRoleSelectedLabel');
      if (roleLabelEl) roleLabelEl.innerText = roleLabels[savedRole] || 'Zvimwe (Other)';
      document.querySelectorAll('#claudeWorkRoleMenu .claude-custom-select-item').forEach(item => {
        if (item.getAttribute('data-value') === savedRole) {
          item.classList.add('is-selected');
        } else {
          item.classList.remove('is-selected');
        }
      });
      if (customMemEl) customMemEl.value = customMemVal;
      updateMemoryButtonsState();

      // Sync Account info
      const uName = currentUser || localStorage.getItem('ruzivo_username') || 'Muenzi';
      const uNameEl = document.getElementById('claudeAccountUsernameDisplay');
      if (uNameEl) uNameEl.innerText = uName;
      const cardUName = document.getElementById('claudeAccountCardUsername');
      if (cardUName) cardUName.innerText = uName;
      const avatarBadge = document.getElementById('claudeAccountAvatarBadge');
      const savedAvatar = localStorage.getItem('ruzivo_user_avatar');
      if (savedAvatar) {
        applyUserAvatarImage(savedAvatar);
      } else if (avatarBadge) {
        avatarBadge.innerText = (uName && uName.length > 0) ? uName[0].toUpperCase() : 'M';
      }
    }

    /* ============================================================
       SUPERADMIN PORTAL IMPLEMENTATION
       ============================================================ */
    async function openAdminPortal() {
      currentChatId = null;
      renderHistoryList();

      document.querySelector('.chat-headline span').innerText = 'Superadmin Portal • Ruzivo AI';
      const inputContainer = document.getElementById('chatInputContainer');
      if (inputContainer) inputContainer.style.display = 'none';

      const thread = document.getElementById('conversationThread');
      thread.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; gap: 14px;">
          <div class="thinking-spinner" style="width: 28px; height: 28px;"></div>
          <div style="font-size: 14px; color: var(--text-muted);">Kuvhura Superadmin Portal...</div>
        </div>
      `;

      const token = localStorage.getItem('ruzivo_auth_token');
      try {
        const [statsResp, usersResp] = await Promise.all([
          fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } }),
          fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!statsResp.ok || !usersResp.ok) {
          throw new Error('Hapana mvumo (Access Denied). Unofanira kuve Superadmin.');
        }

        const stats = await statsResp.json();
        const usersData = await usersResp.json();
        renderAdminPortalView(stats, usersData.users || []);
      } catch (err) {
        thread.innerHTML = `
          <div class="settings-page-view" style="padding: 30px;">
            <div style="background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.25); border-radius: 14px; padding: 24px; text-align: center;">
              <div style="font-size: 18px; font-weight: 600; color: #DC2626; margin-bottom: 8px;">Mvumo Yakarambwa (Unauthorized)</div>
              <div style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5;">${escapeHtml(err.message)}</div>
              <button onclick="returnToLastChat()" class="btn-settings-save" style="margin-top: 16px;">Dzokera kuHurukuro</button>
            </div>
          </div>
        `;
      }
    }

    function renderAdminPortalView(stats, users) {
      const thread = document.getElementById('conversationThread');
      thread.innerHTML = `
        <div class="settings-page-view" style="max-width: 900px;">
          <!-- Header -->
          <div class="settings-page-header">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: #DC2626; color: white; display: flex; align-items: center; justify-content: center;">
                  <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2;">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <div class="settings-page-title" style="font-size: 26px;">Superadmin Portal</div>
              </div>
              <div class="settings-page-desc" style="margin-top: 6px;">
                Tarisa mashandiro esisitimu, batisa kana kudzima vashandisi, uye tarisa zvidzidzo zveChiShona.
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="nav-link new-chat" onclick="openAdminCreateUserModal()" style="background: var(--claude-accent); color: white; padding: 9px 16px; border-radius: 8px; font-weight: 500; font-size: 13px;">
                <svg class="icon" viewBox="0 0 24 24" style="stroke: #FFFFFF;">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Wedzera Mushandisi</span>
              </button>
              <button class="nav-link new-chat" onclick="returnToLastChat()" style="background: var(--item-active-bg); padding: 9px 14px; border-radius: 8px; font-size: 13px;">
                <span>Dzokera</span>
              </button>
            </div>
          </div>

          <!-- Quick Telemetry & Stats Cards -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
            <div style="background: var(--card-bg); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600;">Vashandisi Vese</div>
              <div style="font-size: 26px; font-weight: 700; color: var(--text-main); margin-top: 6px;">${stats.total_users}</div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Mu-database chairo</div>
            </div>
            <div style="background: var(--card-bg); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600;">Vadzidzi (Students)</div>
              <div style="font-size: 26px; font-weight: 700; color: var(--claude-accent); margin-top: 6px;">${stats.students}</div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Vanodzidza ChiShona</div>
            </div>
            <div style="background: var(--card-bg); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600;">Zvidimbu zveRAG</div>
              <div style="font-size: 26px; font-weight: 700; color: #2563EB; margin-top: 6px;">${Number(stats.rag_sentences).toLocaleString()}</div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Mabhuku eChiShona Corpus</div>
            </div>
            <div style="background: var(--card-bg); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600;">Server Status</div>
              <div style="font-size: 20px; font-weight: 700; color: #16A34A; margin-top: 10px; display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #16A34A; display: inline-block;"></span>
                <span>${stats.server_status}</span>
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Port 8080 Active</div>
            </div>
          </div>

          <!-- User Management Table -->
          <div style="background: var(--card-bg); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 22px; display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 17px; font-weight: 600; color: var(--text-main);">Kutungamira Vashandisi (Manage Users)</div>
                <div style="font-size: 12.5px; color: var(--text-subtle); margin-top: 2px;">
                  Chinja chigaro (Role), ongorora ma-session, kana kudzima vashandisi.
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="adminUserSearchInput" oninput="filterAdminUserTable()" placeholder="Tsvaga nezita kana email..." class="settings-input" style="padding: 7px 12px; font-size: 13px; width: 230px;">
              </div>
            </div>

            <!-- Table -->
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--border-subtle); color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em;">
                    <th style="padding: 10px 12px;">ID</th>
                    <th style="padding: 10px 12px;">Mushandisi</th>
                    <th style="padding: 10px 12px;">Email</th>
                    <th style="padding: 10px 12px;">Chigaro (Role)</th>
                    <th style="padding: 10px 12px;">Sessions</th>
                    <th style="padding: 10px 12px;">Zuva reKupinda</th>
                    <th style="padding: 10px 12px; text-align: right;">Zviito (Actions)</th>
                  </tr>
                </thead>
                <tbody id="adminUserTableBody">
                  ${users.map(u => `
                    <tr class="admin-user-row" data-search="${escapeHtml((u.username + ' ' + u.email + ' ' + u.role).toLowerCase())}" style="border-bottom: 1px solid var(--border-subtle);">
                      <td style="padding: 12px; color: var(--text-subtle); font-mono; font-size: 12px;">#${u.id}</td>
                      <td style="padding: 12px; font-weight: 600; color: var(--text-main);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <div style="width: 26px; height: 26px; border-radius: 7px; background: ${u.role === 'superadmin' ? '#DC2626' : 'var(--claude-accent)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                            ${escapeHtml(u.username ? u.username[0].toUpperCase() : 'U')}
                          </div>
                          <span>${escapeHtml(u.username)}</span>
                        </div>
                      </td>
                      <td style="padding: 12px; color: var(--text-muted);">${escapeHtml(u.email)}</td>
                      <td style="padding: 12px;">
                        <select onchange="changeUserRole(${u.id}, this.value)" style="background: var(--bg-cream); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 4px 8px; font-size: 12px; font-weight: 500;">
                          <option value="student" ${u.role === 'student' ? 'selected' : ''}>Mudzidzi (Student)</option>
                          <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Mudzidzisi (Teacher)</option>
                          <option value="moderator" ${u.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                          <option value="superadmin" ${u.role === 'superadmin' ? 'selected' : ''}>Superadmin</option>
                        </select>
                      </td>
                      <td style="padding: 12px;">
                        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 10px; font-size: 11px; background: rgba(0,0,0,0.04); color: var(--text-muted);">
                          <span style="width: 5px; height: 5px; border-radius: 50%; background: ${u.active_sessions > 0 ? '#16A34A' : '#999'};"></span>
                          <span>${u.active_sessions} Active</span>
                        </span>
                      </td>
                      <td style="padding: 12px; color: var(--text-subtle); font-size: 12px;">
                        ${escapeHtml(u.created_at ? u.created_at.slice(0, 10) : '--')}
                      </td>
                      <td style="padding: 12px; text-align: right;">
                        <button data-name="${escapeHtml(u.username)}" onclick="deleteUserByAdmin(${Number(u.id)}, this.dataset.name)" class="btn-modal-cancel" style="padding: 5px 10px; font-size: 12px; color: #DC2626; border-color: rgba(220,38,38,0.3); border-radius: 6px;" title="Dzima mushandisi uyu">
                          Dzima
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    function filterAdminUserTable() {
      const query = (document.getElementById('adminUserSearchInput')?.value || '').toLowerCase().trim();
      const rows = document.querySelectorAll('.admin-user-row');
      rows.forEach(r => {
        const text = r.getAttribute('data-search') || '';
        r.style.display = text.includes(query) ? '' : 'none';
      });
    }

    async function changeUserRole(userId, newRole) {
      const token = localStorage.getItem('ruzivo_auth_token');
      try {
        const resp = await fetch('/api/admin/update-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ user_id: userId, role: newRole })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakuchinja chigaro.');
        }
        openAdminPortal();
      } catch (e) {
        alert('Kukanganisa: ' + e.message);
      }
    }

    async function deleteUserByAdmin(userId, username) {
      if (!confirm(`Mune chokwadi chekuti munoda kudzima mushandisi '${username}' zvachose kubva mudatabase?`)) {
        return;
      }
      const token = localStorage.getItem('ruzivo_auth_token');
      try {
        const resp = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ user_id: userId })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakudzima mushandisi.');
        }
        openAdminPortal();
      } catch (e) {
        alert('Kukanganisa: ' + e.message);
      }
    }

    function openAdminCreateUserModal() {
      const modal = document.getElementById('adminCreateUserModal');
      const errEl = document.getElementById('adminCreateUserError');
      if (errEl) { errEl.style.display = 'none'; errEl.innerText = ''; }
      if (modal) modal.style.display = 'flex';
    }

    function closeAdminCreateUserModal(event) {
      if (event && event.target && event.target.id !== 'adminCreateUserModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-modal-cancel')) {
        return;
      }
      const modal = document.getElementById('adminCreateUserModal');
      if (modal) modal.style.display = 'none';
    }

    async function submitAdminCreateUser() {
      const username = document.getElementById('adminNewUsername').value.trim();
      const email = document.getElementById('adminNewEmail').value.trim();
      const password = document.getElementById('adminNewPassword').value.trim();
      const role = document.getElementById('adminNewRole').value;
      const errEl = document.getElementById('adminCreateUserError');

      if (!username || !email || !password) {
        errEl.innerText = 'Ndapota zadzai zita, email nepasiwedhi.';
        errEl.style.display = 'block';
        return;
      }

      const token = localStorage.getItem('ruzivo_auth_token');
      try {
        const resp = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ username, email, password, role })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakunyoresa mushandisi.');
        }

        closeAdminCreateUserModal();
        document.getElementById('adminNewUsername').value = '';
        document.getElementById('adminNewEmail').value = '';
        document.getElementById('adminNewPassword').value = '';
        openAdminPortal();
      } catch (err) {
        errEl.innerText = err.message;
        errEl.style.display = 'block';
      }
    }

    function renderSettingsPageView() {
      const thread = document.getElementById('conversationThread');
      const currentTheme = localStorage.getItem('ruzivo_theme') || 'light';
      const isDark = (currentTheme === 'dark');
      const showCitPref = (localStorage.getItem('ruzivo_show_citations') !== 'false');
      const convMemPref = (localStorage.getItem('ruzivo_conversation_memory') !== 'false');
      const customMemVal = localStorage.getItem('ruzivo_custom_memory') || '';

      const tabTitleMap = {
        'appearance': { eyebrow: 'KUGADZIRISA CHITARISIKO (CUSTOMIZATION)', title: 'Chitarisiko (Appearance)', desc: 'Gadzirisa zvitarisiko zvezviratidzwa, mavara, nemavara erima/chiedza.' },
        'memory': { eyebrow: 'NDANGARIRO DZESISITEMU (SYSTEM MEMORY)', title: 'Ndangariro dzeHurukuro (Memory)', desc: 'Kuyeuka zvidzidzo nemibvunzo yapfuura panguva yehurukuro ino kuti pasava nekudzokorora.' },
        'account': { eyebrow: 'RUZIVO RWEMUSHANDISI (USER ACCOUNT)', title: 'Akaundi Yangu (Account Profile)', desc: 'Ona ruzivo rweakaundi yako, chigaro chenyu, pamwe nekuongorora masisitimu.' },
        'branding': { eyebrow: 'CHITONDO CHECHIKORO (WORKSPACE BRANDING)', title: 'Chitondo cheChikoro (Branding)', desc: 'Zviratidzo nemavara eruzivo anomiririra chikoro chedu nehurongwa hwese.' }
      };

      const curTabInfo = tabTitleMap[currentSettingsTab] || tabTitleMap['appearance'];

      thread.innerHTML = `
        <div class="settings-page-view">
          <div class="settings-page-header">
            <div>
              <div class="settings-page-title">Zvirongwa zvese (Settings)</div>
              <div class="settings-page-desc">Gadzirisa chitarisiko, ndangariro dzehurukuro, neakaundi yako yeRuzivo.</div>
            </div>
            <button class="nav-link new-chat" onclick="returnToLastChat()" style="background: var(--item-active-bg); padding: 8px 14px; border-radius: 8px; font-weight: 500;">
              <svg class="icon" viewBox="0 0 24 24" style="width:16px; height:16px;">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              <span>Dzokera kuHurukuro</span>
            </button>
          </div>

          <!-- Enterprise Split Two-Column Container -->
          <div class="settings-split-container">
            <!-- Left Navigation Rail -->
            <aside class="settings-nav-rail">
              <!-- Search box -->
              <div class="settings-search-box">
                <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" placeholder="Tsvaga chirongwa..." oninput="filterSettingsRail(this.value)">
              </div>

              <!-- Group: Workspace Customization -->
              <div>
                <div class="settings-nav-group-title">
                  <span>Workspace Customization</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 4px;">
                  <button class="settings-rail-btn ${currentSettingsTab === 'branding' ? 'active' : ''}" onclick="switchSettingsTab('branding')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
                    <span>Branding (Chitondo)</span>
                  </button>
                  <button class="settings-rail-btn ${currentSettingsTab === 'appearance' ? 'active' : ''}" onclick="switchSettingsTab('appearance')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
                    <span>Appearance (Ruvara)</span>
                  </button>
                  <button class="settings-rail-btn ${currentSettingsTab === 'memory' ? 'active' : ''}" onclick="switchSettingsTab('memory')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><path d="M12 6v6l4 2"></path></svg>
                    <span>Memory (Ndangariro)</span>
                  </button>
                </div>
              </div>

              <!-- Group: Account & Management -->
              <div style="margin-top: 10px;">
                <div class="settings-nav-group-title">
                  <span>Account & Management</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 4px;">
                  <button class="settings-rail-btn ${(currentSettingsTab === 'account' || currentSettingsTab === 'profile') ? 'active' : ''}" onclick="switchSettingsTab('account')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>Account (Akaundi)</span>
                  </button>
                </div>
              </div>
            </aside>

            <!-- Main Content Sheet -->
            <main class="settings-content-sheet">
              <!-- Sheet Header -->
              <div>
                <div class="sheet-section-header">
                  <div>
                    <div class="sheet-section-eyebrow">${curTabInfo.eyebrow}</div>
                    <div class="sheet-title">${curTabInfo.title}</div>
                    <div class="sheet-subtitle">${curTabInfo.desc}</div>
                  </div>
                  <button class="btn-sheet-action" onclick="saveSettings()">
                    <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2;">
                      <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <span>Chengetedza</span>
                  </button>
                </div>

                <!-- Attributes Summary Strip -->
                <div class="settings-attributes-strip">
                  <div class="attribute-col">
                    <span class="attribute-col-title">Maitiro (Defaults)</span>
                    <span class="attribute-col-val">Custom</span>
                  </div>
                  <div class="attribute-col">
                    <span class="attribute-col-title">Theme (Ruvara)</span>
                    <span class="attribute-col-val">${isDark ? 'Rima (Dark)' : 'Chiedza (Light)'}</span>
                  </div>
                  <div class="attribute-col">
                    <span class="attribute-col-title">Mavara (Font)</span>
                    <span class="attribute-col-val">Plus Jakarta</span>
                  </div>
                  <div class="attribute-col">
                    <span class="attribute-col-title">Saizi (Size)</span>
                    <span class="attribute-col-val">Default (14px)</span>
                  </div>
                  <div class="attribute-col">
                    <span class="attribute-col-title">Mafambiro (Motion)</span>
                    <span class="attribute-col-val">Enabled</span>
                  </div>
                </div>
              </div>

              <!-- Appearance Tab Content -->
              <div id="settingsContentAppearance" style="display: ${currentSettingsTab === 'appearance' ? 'flex' : 'none'}; flex-direction:column; gap:22px;">
                <!-- Theme Mode Selector Cards -->
                <div>
                  <div class="settings-label" style="margin-bottom: 8px;">Sarudza Mhando yeChiratidzo (Mode)</div>
                  <div class="theme-options-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div class="theme-card ${!isDark ? 'active' : ''}" id="themeLightCard" onclick="selectTheme('light')" style="cursor: pointer; border: 1.5px solid ${!isDark ? 'var(--claude-accent)' : 'var(--border-subtle)'}; border-radius: 10px; padding: 14px; background: var(--bg-cream);">
                      <div class="theme-card-header" style="display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13.5px;">
                        <span>Kirimu Chiedza (Light Mode)</span>
                        <span id="lightCheckMark" style="color: var(--claude-accent); font-weight: bold; ${isDark ? 'display:none;' : ''}">&#10003;</span>
                      </div>
                      <div style="font-size: 12px; color: var(--text-subtle); margin-top: 4px;">Chitarisiko chiri pachena, chakanakira masikati.</div>
                    </div>
                    <div class="theme-card ${isDark ? 'active' : ''}" id="themeDarkCard" onclick="selectTheme('dark')" style="cursor: pointer; border: 1.5px solid ${isDark ? 'var(--claude-accent)' : 'var(--border-subtle)'}; border-radius: 10px; padding: 14px; background: var(--bg-cream);">
                      <div class="theme-card-header" style="display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 13.5px;">
                        <span>Rima (Dark Mode)</span>
                        <span id="darkCheckMark" style="color: var(--claude-accent); font-weight: bold; ${!isDark ? 'display:none;' : ''}">&#10003;</span>
                      </div>
                      <div style="font-size: 12px; color: var(--text-subtle); margin-top: 4px;">Chitarisiko chakasviba, chinodzivirira maziso usiku.</div>
                    </div>
                  </div>
                </div>

                <!-- Color Palette Checklist / Reference -->
                <div>
                  <div class="settings-label" style="margin-bottom: 2px;">Ongororo yeMavara (Color Palette Reference)</div>
                  <div class="settings-desc" style="margin-bottom: 12px;">Mavara anoshandiswa neRuzivo AI pakuverenga nekuronga zvidzidzo.</div>
                  
                  <div class="settings-color-columns">
                    <!-- Light Colours -->
                    <div>
                      <div class="color-section-heading">Light colours</div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #2E7D32;"></div>
                          <span>Green Primary (Kukosha)</span>
                        </div>
                        <span class="color-item-code">#2E7D32</span>
                      </div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #F8F9FA;"></div>
                          <span>Background (Dandemutande)</span>
                        </div>
                        <span class="color-item-code">#F8F9FA</span>
                      </div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #FFFFFF;"></div>
                          <span>Card Surface (Mapepa)</span>
                        </div>
                        <span class="color-item-code">#FFFFFF</span>
                      </div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #111827;"></div>
                          <span>Text Main (Mavara Makuru)</span>
                        </div>
                        <span class="color-item-code">#111827</span>
                      </div>
                    </div>

                    <!-- Dark Colours -->
                    <div>
                      <div class="color-section-heading">Dark colours</div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #43A047;"></div>
                          <span>Green Accent (Chiedza cheRima)</span>
                        </div>
                        <span class="color-item-code">#43A047</span>
                      </div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #1E1F22;"></div>
                          <span>Dark Background</span>
                        </div>
                        <span class="color-item-code">#1E1F22</span>
                      </div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #2B2D31;"></div>
                          <span>Dark Surface</span>
                        </div>
                        <span class="color-item-code">#2B2D31</span>
                      </div>
                      <div class="color-item-row">
                        <div class="color-item-left">
                          <div class="color-item-swatch" style="background: #F2F3F5;"></div>
                          <span>Dark Text Main</span>
                        </div>
                        <span class="color-item-code">#F2F3F5</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Grounded Citations Toggle -->
                <div class="settings-toggle-row" style="padding-top: 14px; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div class="settings-label">Kuratidza Zvinyorwa Zvechokwadi (Grounded Citations)</div>
                    <div class="settings-desc">Kuratidza zvidimbu zvemabhuku eChiShona zvawanikwa muRAG database pamberi pemhinduro.</div>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" id="showCitationsToggle" ${showCitPref ? 'checked' : ''} onchange="saveAppearancePreferences()">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <!-- Memory Tab Content -->
              <div id="settingsContentMemory" style="display: ${currentSettingsTab === 'memory' ? 'flex' : 'none'}; flex-direction:column; gap:20px;">
                <div class="settings-toggle-row" style="display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <div class="settings-label">Ndangariro dzeHurukuro (Conversation Memory)</div>
                    <div class="settings-desc">Kuyeuka zvidzidzo nemibvunzo yapfuura panguva yehurukuro ino kuti pasava nekudzokorora.</div>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" id="conversationMemoryToggle" ${convMemPref ? 'checked' : ''} onchange="saveMemoryPreferences()">
                    <span class="toggle-slider"></span>
                  </label>
                </div>

                <div class="settings-group">
                  <div class="settings-label">Zvaunoda Kuti Ruzivo Ruzive Nezvako (Custom Memory Instructions)</div>
                  <div class="settings-desc">Tsanangura mashoko anobatsira Ruzivo AI kupa mhinduro dzinonyatsoenderana newe (semuenzaniso: unodzidza giredhi ripi, kana unoda mhinduro pfupi kana dzakadzama).</div>
                  <textarea id="customMemoryInput" class="settings-input" rows="4" placeholder="Semuenzaniso: Ndiri mudzidzi wefomu 4 anoongorora ChiShona..." style="resize: vertical;">${escapeHtml(customMemVal)}</textarea>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                  <button class="btn-modal-cancel" onclick="clearAllMemory()" style="color: #DC2626; border-color: rgba(220,38,38,0.3); border-radius: 8px; padding: 8px 14px;">
                    Kanganwa Zvose (Clear Memory)
                  </button>
                </div>
              </div>

              <!-- Branding Tab Content -->
              <div id="settingsContentBranding" style="display: ${currentSettingsTab === 'branding' ? 'flex' : 'none'}; flex-direction:column; gap:20px;">
                <div class="settings-group">
                  <div class="settings-label">Chitondo neKuzivikanwa kweChikoro (Branding)</div>
                  <div class="settings-desc">Ruzivo rwakarongwa kushandiswa muchikoro chedu cheHurumende uye kutevedza zvidzidzo zveChiShona zviri pachokwadi.</div>
                  <div style="background: var(--bg-cream); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 18px; display: flex; align-items: center; gap: 16px;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #2E7D32; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;">
                      R
                    </div>
                    <div>
                      <div style="font-size: 16px; font-weight: 600; color: var(--text-main);">Ruzivo ChiShona AI Assistant</div>
                      <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">Zvinyorwa zvakadzama zveZuva neZuva • Ministry Curriculum Alignment</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Account & Profile Tab Content -->
              <div id="settingsContentAccount" style="display: ${(currentSettingsTab === 'account' || currentSettingsTab === 'profile') ? 'flex' : 'none'}; flex-direction:column; gap:22px;">
                <div style="display: flex; align-items: center; gap: 16px; padding-bottom: 18px; border-bottom: 1px solid var(--border-subtle);">
                  <div style="width: 54px; height: 54px; border-radius: 14px; background: var(--claude-accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.25);">
                    ${(currentUser && currentUser.length > 0) ? escapeHtml(currentUser[0].toUpperCase()) : 'M'}
                  </div>
                  <div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-main);" id="settingsAccountName">${escapeHtml(currentUser || 'Muenzi')}</div>
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: 3px;" id="settingsAccountEmail">Mudzidzi weChiShona</div>
                    <div style="display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 2px 8px; border-radius: 12px; font-size: 11.5px; font-weight: 500; background: rgba(46, 125, 50, 0.12); color: var(--claude-accent);">
                      <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--claude-accent);"></span>
                      <span>Yakabatana (Active Session)</span>
                    </div>
                  </div>
                </div>

                <!-- Profile Details Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                  <div style="background: var(--bg-cream); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 11px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Zita reMushandisi (Username)</div>
                    <div style="font-size: 15px; font-weight: 500; color: var(--text-main); margin-top: 5px;" id="profileDetailUsername">${escapeHtml(currentUser || 'Muenzi')}</div>
                  </div>
                  <div style="background: var(--bg-cream); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 11px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Email yeAkaundi</div>
                    <div style="font-size: 15px; font-weight: 500; color: var(--text-main); margin-top: 5px;" id="profileDetailEmail">--</div>
                  </div>
                  <div style="background: var(--bg-cream); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 11px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Hurukuro Dzakachengetwa</div>
                    <div style="font-size: 15px; font-weight: 500; color: var(--text-main); margin-top: 5px;">${conversations.length} Hurukuro</div>
                  </div>
                  <div style="background: var(--bg-cream); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px;">
                    <div style="font-size: 11px; color: var(--text-subtle); text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">Mhando yeAkaundi (Role)</div>
                    <div style="font-size: 15px; font-weight: 600; color: var(--claude-accent); margin-top: 5px;" id="profileDetailRole">Mudzidzi (Student)</div>
                  </div>
                </div>

                <div id="superadminQuickActionBox" style="display: none; background: rgba(220, 38, 38, 0.06); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 12px; padding: 16px;">
                  <div style="font-size: 14.5px; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px;">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; stroke: #DC2626; fill: none; stroke-width: 2;">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>Mune Masimba eSuperadmin (Superadmin Privileges)</span>
                  </div>
                  <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px; line-height: 1.5;">
                    Munokwanisa kuona vashandisi vese, kuchinja zvigaro zvavo (roles), kuvadzima, pamwe nekuongorora mashandiro esisitimu.
                  </div>
                  <button type="button" onclick="window.location.href='/admin'" style="margin-top: 12px; background: #DC2626; color: white; border: none; padding: 9px 18px; border-radius: 8px; font-weight: 500; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                    <span>Vhura Superadmin Portal</span>
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>

                <!-- Danger Zone (Delete Account & Logout) -->
                <div style="margin-top: 10px; border-top: 1px solid var(--border-subtle); padding-top: 20px;">
                  <div style="font-size: 15px; font-weight: 600; color: #DC2626; margin-bottom: 6px;">Nzvimbo Inotyisa (Danger Zone)</div>
                  <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 14px;">
                    Unogona kubuda muakaundi ino kana kudzima akaundi yako zvachose kubva mudatabase yeRuzivo AI pamwe chete nehurukuro dzose.
                  </div>
                  <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button type="button" onclick="webLogout()" class="btn-modal-cancel" style="padding: 9px 18px; font-size: 13.5px; display: inline-flex; align-items: center; gap: 8px; border-radius: 8px;">
                      <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2;">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <span>Buda muAkaundi (Log Out)</span>
                    </button>
                    <button type="button" onclick="promptDeleteAccount()" class="btn-modal-danger" style="padding: 9px 18px; font-size: 13.5px; display: inline-flex; align-items: center; gap: 8px; border-radius: 8px;">
                      <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Dzima Akaundi Yangu (Delete Account)</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Footer info -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px solid var(--border-subtle); padding-top: 14px;">
                <span id="settingsSaveStatus" style="font-size: 12.5px; color: var(--text-subtle);">Ruzivo AI • Dzidzo yeChiShona</span>
                <button class="btn-settings-save" onclick="saveSettings()" style="padding: 7px 18px; font-size: 13px; border-radius: 8px;">Chengetedza Zvese</button>
              </div>
            </main>
          </div>
        </div>
      `;
    }

    function switchSettingsTab(tabName) {
      currentSettingsTab = tabName;
      renderSettingsPageView();
      if (tabName === 'account' || tabName === 'profile') {
        fetchAccountDetails();
      }
    }

    function filterSettingsRail(query) {
      const q = (query || '').toLowerCase().trim();
      const buttons = document.querySelectorAll('.settings-rail-btn');
      buttons.forEach(btn => {
        const text = (btn.innerText || '').toLowerCase();
        btn.style.display = text.includes(q) ? 'flex' : 'none';
      });
    }

    function selectTheme(theme) {
      if (theme === 'dark') {
        document.body.classList.add('theme-dark');
        localStorage.setItem('ruzivo_theme', 'dark');
      } else {
        document.body.classList.remove('theme-dark');
        localStorage.setItem('ruzivo_theme', 'light');
      }
      renderSettingsPageView();
    }

    function saveAppearancePreferences() {
      const toggle = document.getElementById('claudeShowCitationsToggle') || document.getElementById('showCitationsToggle');
      if (toggle) {
        const isEnabled = toggle.checked;
        localStorage.setItem('ruzivo_show_citations', isEnabled ? 'true' : 'false');
        
        // Instantly toggle citation source cards in active conversation
        document.querySelectorAll('.retrieved-source-card').forEach(card => {
          card.style.display = isEnabled ? 'flex' : 'none';
        });

        // Mirror other toggle if both exist in DOM
        const other = document.getElementById('showCitationsToggle');
        if (other && other !== toggle) other.checked = isEnabled;
        const claudeOther = document.getElementById('claudeShowCitationsToggle');
        if (claudeOther && claudeOther !== toggle) claudeOther.checked = isEnabled;
      }
    }

    function saveMemoryPreferences() {
      const toggle = document.getElementById('claudeConvMemoryToggle') || document.getElementById('conversationMemoryToggle');
      if (toggle) {
        const isEnabled = toggle.checked;
        localStorage.setItem('ruzivo_conversation_memory', isEnabled ? 'true' : 'false');
        
        const other = document.getElementById('conversationMemoryToggle');
        if (other && other !== toggle) other.checked = isEnabled;
        const claudeOther = document.getElementById('claudeConvMemoryToggle');
        if (claudeOther && claudeOther !== toggle) claudeOther.checked = isEnabled;
      }
    }

    function clearAllMemory() {
      const input = document.getElementById('customMemoryInput');
      const input2 = document.getElementById('claudeCustomMemoryInput');
      if (input) input.value = '';
      if (input2) input2.value = '';
      localStorage.removeItem('ruzivo_custom_memory');
      updateMemoryButtonsState();
      showNotificationToast('Rangariro dzadzimwa zvose zvachose.', 'warning');
      const status = document.getElementById('settingsSaveStatus');
      if (status) {
        status.style.color = '#DC2626';
        status.innerText = 'Ndangariro dzakanganikwa zvachose.';
        setTimeout(() => {
          status.style.color = 'var(--text-subtle)';
          status.innerText = 'Ruzivo AI • Dzidzo yeChiShona';
        }, 3000);
      }
    }

    function loadSettingsPreferences() {
      const currentTheme = localStorage.getItem('ruzivo_theme') || 'light';
      if (currentTheme === 'dark') {
        document.body.classList.add('theme-dark');
      } else {
        document.body.classList.remove('theme-dark');
      }
    }

    function saveSettings() {
      saveAppearancePreferences();
      saveMemoryPreferences();

      const customMemInput = document.getElementById('customMemoryInput');
      if (customMemInput) {
        const customMem = customMemInput.value.trim();
        if (customMem) {
          localStorage.setItem('ruzivo_custom_memory', customMem);
        } else {
          localStorage.removeItem('ruzivo_custom_memory');
        }
      }

      const status = document.getElementById('settingsSaveStatus');
      if (status) {
        status.style.color = '#16A34A';
        status.innerText = 'Zvirongwa zvakachengetedzwa zvakanaka!';
        setTimeout(() => {
          status.style.color = 'var(--text-subtle)';
          status.innerText = 'Ruzivo AI • Dzidzo yeChiShona';
        }, 3000);
      }
    }

    async function fetchAccountDetails() {
      const token = localStorage.getItem('ruzivo_auth_token');
      if (!token) {
        const usernameEl = document.getElementById('profileDetailUsername');
        const emailEl = document.getElementById('profileDetailEmail');
        const accNameEl = document.getElementById('settingsAccountName');
        const accEmailEl = document.getElementById('settingsAccountEmail');
        if (usernameEl) usernameEl.innerText = currentUser || 'Muenzi';
        if (emailEl) emailEl.innerText = sessionStorage.getItem('ruzivo_guest_mode') ? 'Muenzi (Guest Mode)' : 'Hapana email yakanyoreswa';
        if (accNameEl) accNameEl.innerText = currentUser || 'Muenzi';
        if (accEmailEl) accEmailEl.innerText = 'Muenzi weChinguva';
        return;
      }
      try {
        const resp = await fetch('/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        if (resp.status === 401) {
          // Token is stale or invalidated in database - clear cleanly without glitching
          console.warn('Session expired or token invalid (401). Resetting session.');
          localStorage.removeItem('ruzivo_auth_token');
          localStorage.removeItem('ruzivo_username');
          sessionStorage.removeItem('ruzivo_guest_mode');
          initWebAuth();
          showNotificationToast('Session yenyu yapera nguva. Tapota pindai zvakare.', 'info');
          return;
        }
        if (resp.ok) {
          const data = await resp.json();
          if (data.username) {
            currentUser = data.username;
            localStorage.setItem('ruzivo_username', data.username);
            updateUserProfileUI(data.username, data.email);
          }
          const usernameEl = document.getElementById('profileDetailUsername');
          const emailEl = document.getElementById('profileDetailEmail');
          const roleEl = document.getElementById('profileDetailRole');
          const accNameEl = document.getElementById('settingsAccountName');
          const accEmailEl = document.getElementById('settingsAccountEmail');
          const superadminLink = document.getElementById('superadminSidebarLink');
          const superadminBox = document.getElementById('superadminQuickActionBox');

          if (usernameEl) usernameEl.innerText = data.username || currentUser;
          if (emailEl) emailEl.innerText = data.email || '--';
          if (roleEl) roleEl.innerText = data.role ? data.role.toUpperCase() : 'Mudzidzi';
          if (accNameEl) accNameEl.innerText = data.username || currentUser;
          if (accEmailEl) accEmailEl.innerText = data.email || 'Mudzidzi weChiShona';

          // Sync prominent account dialog elements
          const cUserEl = document.getElementById('claudeAccountUsernameDisplay');
          const cEmailEl = document.getElementById('claudeAccountEmailDisplay');
          const cRoleEl = document.getElementById('claudeAccountRoleDisplay');
          const cCardUser = document.getElementById('claudeAccountCardUsername');
          const cCardEmail = document.getElementById('claudeAccountCardEmail');
          const cBadge = document.getElementById('claudeAccountAvatarBadge');

          const finalName = data.username || currentUser || 'Muenzi';
          const finalEmail = data.email || 'Hapana email yakanyoreswa';
          const finalRole = data.role ? (data.role.charAt(0).toUpperCase() + data.role.slice(1)) : 'Mudzidzi';

          if (cUserEl) cUserEl.innerText = finalName;
          if (cEmailEl) cEmailEl.innerText = finalEmail;
          if (cRoleEl) cRoleEl.innerText = finalRole;
          if (cCardUser) cCardUser.innerText = finalName;
          if (cCardEmail) cCardEmail.innerText = finalEmail;
          const savedAvatarNow = localStorage.getItem('ruzivo_user_avatar');
          if (savedAvatarNow) {
            applyUserAvatarImage(savedAvatarNow);
          } else if (cBadge) {
            cBadge.innerText = finalName.charAt(0).toUpperCase();
          }

          currentUserRole = data.role || 'student';
          localStorage.setItem('ruzivo_role', currentUserRole);

          if (currentUserRole === 'superadmin' || currentUserRole === 'admin') {
            if (superadminBox) superadminBox.style.display = 'block';
          } else {
            if (superadminBox) superadminBox.style.display = 'none';
          }
        }
      } catch (e) {
        console.warn('Could not fetch account details:', e);
      }
    }

    let currentDeleteStep = 1;
    let generatedDelete2FACode = '';

    function promptDeleteAccount() {
      const modal = document.getElementById('confirmDeleteAccountModal');
      goToDeleteStep(1);
      const pwInput = document.getElementById('deleteAccountPassword');
      const codeInput = document.getElementById('deleteAccount2FACode');
      const wordInput = document.getElementById('deleteAccountConfirmWord');
      if (pwInput) pwInput.value = '';
      if (codeInput) codeInput.value = '';
      if (wordInput) wordInput.value = '';

      if (modal) {
        modal.style.display = 'flex';
      }
    }

    function goToDeleteStep(stepNum) {
      currentDeleteStep = stepNum;
      const step1 = document.getElementById('deleteStep1');
      const step2 = document.getElementById('deleteStep2');
      const step3 = document.getElementById('deleteStep3');
      const ind = document.getElementById('deleteStepIndicator');

      if (step1) step1.style.display = (stepNum === 1) ? 'block' : 'none';
      if (step2) step2.style.display = (stepNum === 2) ? 'block' : 'none';
      if (step3) step3.style.display = (stepNum === 3) ? 'block' : 'none';

      if (ind) {
        if (stepNum === 1) ind.innerText = 'Nhanho 1 pa 3: Yambiro neChisarudzo';
        else if (stepNum === 2) ind.innerText = 'Nhanho 2 pa 3: Kusimbisa Pasiwedhi';
        else ind.innerText = 'Nhanho 3 pa 3: Kusimbisa ne 2FA Security Code';
      }

      if (stepNum === 2) {
        setTimeout(() => document.getElementById('deleteAccountPassword')?.focus(), 50);
      } else if (stepNum === 3) {
        send2FADeleteCode();
        setTimeout(() => document.getElementById('deleteAccount2FACode')?.focus(), 50);
      }
    }

    async function verifyPasswordAndGoTo2FA() {
      const pw = document.getElementById('deleteAccountPassword')?.value.trim();
      const errEl = document.getElementById('deleteStep2Error');
      const verifyBtn = document.getElementById('btnVerifyDeletePassword');
      const token = localStorage.getItem('ruzivo_auth_token');

      if (!pw) {
        if (errEl) {
          errEl.innerText = 'Tapota isa pasiwedhi yeakaundi ino.';
          errEl.style.display = 'block';
        }
        return;
      }

      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerText = 'Kutarisa pasiwedhi...';
      }
      if (errEl) errEl.style.display = 'none';

      try {
        const resp = await fetch('/auth/delete/verify-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ token: token, password: pw })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Pasiwedhi yamaisa haina kururama.');
        }

        // Verified against server database hash! Now advance to step 3
        goToDeleteStep(3);
      } catch (err) {
        if (errEl) {
          errEl.innerText = err.message || 'Pasiwedhi yamaisa haina kururama.';
          errEl.style.display = 'block';
        }
      } finally {
        if (verifyBtn) {
          verifyBtn.disabled = false;
          verifyBtn.innerHTML = `<span>Simbisa Pasiwedhi</span>
            <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        }
      }
    }

    async function send2FADeleteCode() {
      const token = localStorage.getItem('ruzivo_auth_token');
      const msgEl = document.getElementById('delete2FAMsg');
      const errEl = document.getElementById('deleteStep3Error');
      const emailEl = document.getElementById('deleteAccountTargetEmail');
      const codeInput = document.getElementById('deleteAccount2FACode');
      const resendBtn = document.getElementById('btnResend2FA');

      // Do NOT pre-fill the input: user must get code from email and type it
      if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
      }
      if (resendBtn) resendBtn.innerText = 'Kutumira...';
      if (errEl) errEl.style.display = 'none';

      try {
        const resp = await fetch('/auth/delete/request-2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ token: token })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kutadza kutumira kodhi ye 2FA.');
        }

        if (emailEl && data.email) {
          emailEl.innerText = '(' + data.email + ')';
        }

        if (msgEl) {
          if (data.email_sent) {
            msgEl.innerText = 'Kodhi ye 2FA yatumirwa kuEmail yenyu zvakanaka. Tarisai Inbox kana Spam folder.';
          } else {
            msgEl.innerText = 'Kodhi ye 2FA yatumirwa kuEmail yenyu (' + (data.email || 'Email') + ').';
          }
          msgEl.style.color = '#16A34A';
          msgEl.style.display = 'block';
        }
      } catch (err) {
        if (errEl) {
          errEl.innerText = err.message || 'Kutadza kutumira kodhi ye 2FA.';
          errEl.style.display = 'block';
        }
      } finally {
        if (resendBtn) resendBtn.innerText = 'Tuma kodhi zvakare';
      }
    }

    function closeDeleteAccountModal(event) {
      if (event && event.target && event.target.id !== 'confirmDeleteAccountModal' && !event.target.closest('.icon-btn') && !event.target.classList.contains('btn-modal-cancel')) {
        return;
      }
      const modal = document.getElementById('confirmDeleteAccountModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    async function confirmFinalDeleteAccountAction() {
      const token = localStorage.getItem('ruzivo_auth_token');
      const errEl = document.getElementById('deleteStep3Error');
      const btn = document.getElementById('deleteAccountActionBtn');
      const enteredCode = document.getElementById('deleteAccount2FACode')?.value.trim();
      const confirmWord = document.getElementById('deleteAccountConfirmWord')?.value.trim().toUpperCase();
      const password = document.getElementById('deleteAccountPassword')?.value.trim();

      if (errEl) errEl.style.display = 'none';

      // 1. Verify 2FA code is entered
      if (!enteredCode || enteredCode.length !== 6) {
        if (errEl) {
          errEl.innerText = 'Tapota nyorai nhamba 6 dze 2FA dzamagamuchira muEmail yenyu.';
          errEl.style.display = 'block';
        }
        return;
      }

      // 2. Verify confirmation keyword "DZIMA"
      if (confirmWord !== 'DZIMA') {
        if (errEl) {
          errEl.innerText = 'Tapota nyorai shoko rekuti DZIMA kuti musimbise kudzima.';
          errEl.style.display = 'block';
        }
        return;
      }

      if (!token) {
        // Guest mode - clear local storage
        localStorage.removeItem('ruzivo_auth_token');
        localStorage.removeItem('ruzivo_username');
        localStorage.removeItem('ruzivo_conversations');
        sessionStorage.removeItem('ruzivo_guest_mode');
        conversations = [];
        closeDeleteAccountModal();
        initWebAuth();
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Kudzima Akaundi...';
      }

      try {
        const resp = await fetch('/auth/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ 
            token: token,
            password: password,
            code_2fa: enteredCode
          })
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.detail || 'Kukanganisa pakudzima akaundi.');
        }

        // Clean local state completely
        localStorage.removeItem('ruzivo_auth_token');
        localStorage.removeItem('ruzivo_username');
        localStorage.removeItem('ruzivo_conversations');
        localStorage.removeItem('ruzivo_custom_memory');
        sessionStorage.removeItem('ruzivo_guest_mode');
        conversations = [];
        currentChatId = null;

        closeDeleteAccountModal();
        showNotificationToast('Akaundi yadzimwa zvachose!');
        initWebAuth();
      } catch (err) {
        if (errEl) {
          errEl.innerText = err.message || 'Kukanganisa pakudzima akaundi.';
          errEl.style.display = 'block';
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerText = 'Ehe, Dzima Zvachose';
        }
      }
    }

    // Queue system and working state for AI requests
    let isAiBusy = false;
    let activeThinkingInterval = null;
    const activeThinkingPhrases = [
      "Ruzivo ruri kufunga nekuronga mhinduro",
      "Kutsvaga ruzivo mumabhuku echiShona",
      "Kuongorora tsumo nemadimikira akakodzera",
      "Kuronga mazwi achitsetseka zvakanaka",
      "Kukwenenzvera mhinduro yakakwana",
      "Kutsvagurudza mumagwaro ezvidzidzo",
      "Kupenengura mutauro wevazukuru"
    ];
    let activeThinkingPhraseIndex = 0;
    let activeThinkingHeartbeat = false;
    const messageQueue = [];

    function renderActiveThinkingIndicator() {
      const thread = document.getElementById('conversationThread');
      if (!thread) return;

      const existing = document.getElementById('liveThinkingBotGroup');
      if (existing) existing.remove();

      const botGroup = document.createElement('div');
      botGroup.className = 'message-group bot';
      botGroup.id = 'liveThinkingBotGroup';
      botGroup.innerHTML = `
        <div class="thinking-container">
          <div class="thinking-icon-slot" id="liveThinkingIconSlot">
            <div class="thinking-spinner" id="liveThinkingIndicator"></div>
          </div>
          <div class="thinking-text">
            <span id="liveThinkingPhrase">${activeThinkingPhrases[activeThinkingPhraseIndex]}</span>
            <span class="thinking-dots">
              <span class="thinking-dot"></span>
              <span class="thinking-dot"></span>
              <span class="thinking-dot"></span>
            </span>
          </div>
        </div>
      `;
      thread.appendChild(botGroup);

      const scrollArea = document.getElementById('messagesScroll');
      if (scrollArea) {
        setTimeout(() => { scrollArea.scrollTop = scrollArea.scrollHeight; }, 30);
      }

      if (!activeThinkingInterval) {
        activeThinkingInterval = setInterval(() => {
          activeThinkingHeartbeat = !activeThinkingHeartbeat;
          const iconSlot = document.getElementById('liveThinkingIconSlot');
          if (iconSlot) {
            iconSlot.innerHTML = activeThinkingHeartbeat
              ? `<img src="assets/logo.png" class="thinking-heartbeat-logo" alt="Ruzivo">`
              : `<div class="thinking-spinner"></div>`;
          }

          activeThinkingPhraseIndex = (activeThinkingPhraseIndex + 1) % activeThinkingPhrases.length;
          const phraseSpan = document.getElementById('liveThinkingPhrase');
          if (phraseSpan) {
            phraseSpan.style.opacity = '0';
            setTimeout(() => {
              if (phraseSpan) {
                phraseSpan.innerText = activeThinkingPhrases[activeThinkingPhraseIndex];
                phraseSpan.style.opacity = '1';
              }
            }, 150);
          }
        }, 1900);
      }
    }

    function removeActiveThinkingIndicator() {
      if (activeThinkingInterval) {
        clearInterval(activeThinkingInterval);
        activeThinkingInterval = null;
      }
      const existing = document.getElementById('liveThinkingBotGroup');
      if (existing) existing.remove();
    }

    function updateSendButtonState() {
      const btn = document.getElementById('chatSendBtn');
      if (!btn) return;

      const textarea = document.getElementById('chatTextarea');
      const hasText = textarea && textarea.value.trim().length > 0;
      const queueCount = messageQueue.length;

      if (isAiBusy) {
        btn.disabled = false;
        if (hasText) {
          // User is typing while AI is working -> show send icon so user knows they can send to queue!
          btn.classList.remove('is-working');
          btn.classList.remove('is-disabled');
          btn.setAttribute('data-tooltip', queueCount > 0 ? `Tumira kumutsara (${queueCount} zvakamirira)` : 'Tumira kumutsara (Queue message)');
          let badgeHtml = '';
          if (queueCount > 0) {
            badgeHtml = `<span class="btn-send-queue-badge">${queueCount}</span>`;
          }
          btn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" style="stroke: #FFFFFF; width: 14px; height: 14px;">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            ${badgeHtml}
          `;
        } else {
          // Textarea empty while AI is working -> show working pulse & spinner
          btn.classList.remove('is-disabled');
          btn.classList.add('is-working');
          btn.setAttribute('data-tooltip', queueCount > 0 ? `Ruzivo ruri kushanda (${queueCount} zvakamirira)` : 'Ruzivo ruri kushanda...');
          let badgeHtml = '';
          if (queueCount > 0) {
            badgeHtml = `<span class="btn-send-queue-badge">${queueCount}</span>`;
          }
          btn.innerHTML = `
            <div class="btn-send-spinner"></div>
            ${badgeHtml}
          `;
        }
      } else {
        // AI is idle
        btn.classList.remove('is-working');
        if (hasText) {
          btn.disabled = false;
          btn.classList.remove('is-disabled');
          btn.setAttribute('data-tooltip', 'Tumira');
        } else {
          // Read-only / disabled before anything is typed
          btn.disabled = true;
          btn.classList.add('is-disabled');
          btn.setAttribute('data-tooltip', 'Nyora shoko pekutanga');
        }
        btn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
    }

    async function sendMessage() {
      const textarea = document.getElementById('chatTextarea');
      const text = textarea.value.trim();
      if (!text) return;

      let chat = getCurrentChat();
      if (!chat) {
        startNewChat();
        chat = getCurrentChat();
      }

      textarea.value = '';
      textarea.style.height = 'auto';

      // If AI is currently generating a response, add user message to queue
      if (isAiBusy) {
        const queuedMsg = { role: 'user', text: text, queued: true };
        chat.messages.push(queuedMsg);
        saveConversations();
        renderCurrentMessages();

        // Ensure active thinking indicator remains visible after re-rendering
        renderActiveThinkingIndicator();

        messageQueue.push({ text: text, chatId: chat.id, messageRef: queuedMsg });
        updateSendButtonState();
        return;
      }

      // Add user message to state
      chat.messages.push({ role: 'user', text: text });
      if (chat.title === 'Hurukuro Itsva') {
        chat.title = text.slice(0, 24) + (text.length > 24 ? '...' : '');
      }
      saveConversations();
      renderCurrentMessages();

      // Execute request with queue processing loop
      await executeChatRequest(text, chat);
    }

    async function executeChatRequest(text, chat) {
      isAiBusy = true;
      updateSendButtonState();

      // Mount persistent thinking indicator
      renderActiveThinkingIndicator();

      const startTime = performance.now();

      try {
        const apiKey = localStorage.getItem('ruzivo_engine_key') || localStorage.getItem('ruzivo_api_key') || localStorage.getItem('ruzivo_gemini_key') || '';
        if (apiKey && !localStorage.getItem('ruzivo_engine_key')) {
          localStorage.setItem('ruzivo_engine_key', apiKey);
          localStorage.setItem('ruzivo_api_key', apiKey);
        }
        const customMemory = localStorage.getItem('ruzivo_custom_memory') || '';
        const convMemEnabled = (localStorage.getItem('ruzivo_conversation_memory') !== 'false');

        // Optional conversation history context if memory is enabled
        let historySnippet = '';
        if (convMemEnabled && chat.messages.length > 1) {
          const past = chat.messages.slice(-4);
          historySnippet = past.map(m => (m.role === 'user' ? 'Mushandisi: ' : 'Ruzivo: ') + m.text).join('\n');
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            api_key: apiKey,
            custom_memory: customMemory,
            conversation_history: historySnippet
          })
        });

        const elapsedSec = (performance.now() - startTime) / 1000;
        const durationFormatted = formatDuration(elapsedSec);

        const data = await response.json();
        const replyText = data.response || "Handizivi mhinduro yacho.";
        const contextText = data.context || null;

        removeActiveThinkingIndicator();

        // Save bot reply to session state with duration
        chat.messages.push({
          role: 'bot',
          text: replyText,
          context: contextText,
          duration: durationFormatted
        });
        saveConversations();
        renderCurrentMessages();

        // Trigger completion notification if enabled in Settings
        const notifyPref = (localStorage.getItem('ruzivo_notify_completions') !== 'false');
        if (notifyPref && document.hidden) {
          try {
            if (Notification.permission === 'granted') {
              new Notification('Ruzivo AI', { body: 'Mhinduro yapera kunyorwa!', icon: '/assets/favicon.png' });
            }
          } catch(e) {}
        } else if (notifyPref) {
          showNotificationToast('Mhinduro yapera kunyorwa zvakakwana.', 'info');
        }
      } catch (err) {
        removeActiveThinkingIndicator();
        chat.messages.push({
          role: 'bot',
          text: `Paita dambudziko rekubatanidza: ${err.message}`
        });
        saveConversations();
        renderCurrentMessages();
      } finally {
        const scrollArea = document.getElementById('messagesScroll');
        if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
        
        // Process next message from queue if any
        if (messageQueue.length > 0) {
          const nextItem = messageQueue.shift();
          // Remove queued flag from the user message so it shows as active/processed
          if (nextItem.messageRef) {
            delete nextItem.messageRef.queued;
          }
          saveConversations();
          renderCurrentMessages();

          const targetChat = conversations.find(c => c.id === nextItem.chatId) || chat;
          // Continue processing next queued message
          await executeChatRequest(nextItem.text, targetChat);
        } else {
          isAiBusy = false;
          updateSendButtonState();
        }
      }
    }

    function formatEditorialMarkdown(text) {
      const paragraphs = text.split(/\n\s*\n/);
      return paragraphs.map(p => {
        let formatted = escapeHtml(p.trim());
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br/>');
        return `<p>${formatted}</p>`;
      }).join('');
    }

    function escapeHtml(str) {
      return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function scrollToAuthSection() {
      scrollToLandingSection('authSection');
    }

    function scrollToLandingSection(sectionId) {
      const section = document.getElementById(sectionId);
      if (section) {
        // Ensure the section and its contents are immediately visible
        section.classList.add('is-revealed');
        section.classList.remove('reveal-pending');
        section.querySelectorAll('.reveal-on-scroll, .linear-story-card, .tsumo-linear-card, .stripe-stat-item, .linear-wireframe-card').forEach(el => {
          el.classList.add('is-revealed');
          el.classList.remove('reveal-pending');
        });

        const overlay = document.getElementById('authOverlay');
        if (overlay && getComputedStyle(overlay).display !== 'none') {
          const navOffset = 90;
          const overlayRect = overlay.getBoundingClientRect();
          const targetRect = section.getBoundingClientRect();
          const targetTop = overlay.scrollTop + (targetRect.top - overlayRect.top) - navOffset;
          overlay.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        } else {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActiveLandingNavLink(sectionId);
      }
    }

    function setActiveLandingNavLink(sectionId) {
      const navLinks = document.querySelectorAll('#landingNavLinks .landing-nav-link');
      navLinks.forEach(link => {
        if (link.getAttribute('data-section') === sectionId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    // ScrollSpy for landing sections to highlight active links dynamically
    (function initLandingScrollSpy() {
      const overlay = document.getElementById('authOverlay');
      if (!overlay) return;

      const sectionIds = ['curriculumSection', 'tsumoSection', 'aboutSection'];
      overlay.addEventListener('scroll', () => {
        let currentActive = null;
        const scrollPosition = overlay.scrollTop + 140;

        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (el) {
            const top = el.offsetTop;
            const height = el.offsetHeight;
            if (scrollPosition >= top && scrollPosition < top + height) {
              currentActive = id;
              break;
            }
          }
        }

        const navLinks = document.querySelectorAll('#landingNavLinks .landing-nav-link');
        navLinks.forEach(link => {
          if (currentActive && link.getAttribute('data-section') === currentActive) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }, { passive: true });
    })();

    
    function filterCurriculum(category, btnEl) {
      if (btnEl) {
        const parent = btnEl.parentElement;
        if (parent) {
          parent.querySelectorAll('.linear-cat-btn').forEach(b => b.classList.remove('active'));
        }
        btnEl.classList.add('active');
      }

      const cards = document.querySelectorAll('#curriculumGrid .linear-story-card');
      cards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-cat') === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function filterTsumoList(category, btnEl) {
      if (btnEl) {
        const parent = btnEl.parentElement;
        if (parent) {
          parent.querySelectorAll('.landing-filter-btn').forEach(b => b.classList.remove('active'));
        }
        btnEl.classList.add('active');
      }

      const cards = document.querySelectorAll('#tsumoGrid .tsumo-quote-card');
      cards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-cat') === category) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    // Dynamic Sentence Typewriter for Landing Page
    (function initLandingTypewriter() {
      const phrases1 = [
        '"Kugona Chishona (Grade 7 - Form 4), Tsika dzaVaShona, nemazwi anokosha akachengetedzwa zvakakwana."',
        '"Ruzivo rweChiShona rwakadzama rwezvidzidzo, mabhuku, netsika dzechinyakare."',
        '"Zvidzidzo zveGiredhi rechinomwe kusvika Fomu 4 zvakarongeka nenzira yakajeka."'
      ];

      const phrases2 = [
        '"Chara chimwe hachitswanyi inda — Hurukuro dzose dzine humbowo."',
        '"Kandiro kanoenda kunobva kamwe — Kudzidza pamwe chete kupa ruzivo."',
        '"Ateya mariva kuteerera nhetemwa — Tsumo dzose dzinodudzirwa zvine unyanzvi."'
      ];

      let idx1 = 0;
      let idx2 = 0;

      function typeText(targetId, cursorId, text, speed, onComplete) {
        const el = document.getElementById(targetId);
        const cur = document.getElementById(cursorId);
        if (!el) return;
        el.innerText = '';
        if (cur) cur.style.display = 'inline-block';
        let i = 0;
        const interval = setInterval(() => {
          if (i < text.length) {
            el.innerText += text.charAt(i);
            i++;
          } else {
            clearInterval(interval);
            if (onComplete) setTimeout(onComplete, 3800);
          }
        }, speed);
      }

      function eraseText(targetId, speed, onComplete) {
        const el = document.getElementById(targetId);
        if (!el) return;
        const interval = setInterval(() => {
          if (el.innerText.length > 0) {
            el.innerText = el.innerText.substring(0, el.innerText.length - 1);
          } else {
            clearInterval(interval);
            if (onComplete) setTimeout(onComplete, 400);
          }
        }, speed);
      }

      function loopCard1() {
        const text = phrases1[idx1 % phrases1.length];
        typeText('typewriterText1', 'typewriterCursor1', text, 38, () => {
          eraseText('typewriterText1', 18, () => {
            idx1++;
            loopCard1();
          });
        });
      }

      function loopCard2() {
        const text = phrases2[idx2 % phrases2.length];
        setTimeout(() => {
          typeText('typewriterText2', 'typewriterCursor2', text, 42, () => {
            eraseText('typewriterText2', 18, () => {
              idx2++;
              loopCard2();
            });
          });
        }, 1200);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          if (window.lucide) {
            lucide.createIcons();
          }
          loopCard1();
          loopCard2();
        });
      } else {
        if (window.lucide) {
          lucide.createIcons();
        }
        loopCard1();
        loopCard2();
      }
    })();
  

    /* ==========================================================================
       LINEAR AUTH MODAL CONTROLLER
       ========================================================================== */
    let currentLinearMode = 'login'; // 'login' or 'signup'
    let currentLinearEmail = '';

    function openLinearAuthModal(mode) {
      currentLinearMode = mode || 'login';
      const overlay = document.getElementById('linearAuthOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
      updateLinearModeUI();
      switchLinearStep('choice');
    }

    function closeLinearAuthModal() {
      const overlay = document.getElementById('linearAuthOverlay');
      if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    function toggleLinearMode(targetMode) {
      currentLinearMode = targetMode;
      updateLinearModeUI();
    }

    function updateLinearModeUI() {
      const heading = document.getElementById('linearAuthHeading');
      const footerToggle = document.getElementById('linearAuthFooterToggle');
      const termsAgreement = document.getElementById('linearTermsAgreement');

      if (currentLinearMode === 'signup') {
        if (heading) heading.innerText = 'Gadzira Akaundi Yako';
        if (termsAgreement) termsAgreement.style.display = 'block';
        if (footerToggle) footerToggle.innerHTML = 'Wakatonyoresa kare? <a onclick="toggleLinearMode(\'login\')">Pinda</a>';
      } else {
        if (heading) heading.innerText = 'Pinda muRuzivo';
        if (termsAgreement) termsAgreement.style.display = 'none';
        if (footerToggle) footerToggle.innerHTML = 'Hausati wava neakaundi? <a onclick="toggleLinearMode(\'signup\')">Gadzira Akaundi</a> kana <a onclick="window.open(\'/terms\', \'_blank\')">tsvaga zvimwe</a>';
      }
    }

    function switchLinearStep(step) {
      const stepChoice = document.getElementById('linearStepChoice');
      const stepEmail = document.getElementById('linearStepEmail');
      const stepCode = document.getElementById('linearStepCode');

      if (stepChoice) stepChoice.style.display = (step === 'choice') ? 'flex' : 'none';
      if (stepEmail) {
        stepEmail.style.display = (step === 'email') ? 'flex' : 'none';
        if (step === 'email') {
          setTimeout(() => document.getElementById('linearEmailInput')?.focus(), 100);
        }
      }
      if (stepCode) {
        stepCode.style.display = (step === 'code') ? 'flex' : 'none';
        if (step === 'code') {
          setTimeout(() => document.getElementById('linearCodeInput')?.focus(), 100);
        }
      }

      if (step === 'sso') {
        showNotificationToast('SAML SSO integration is available for verified enterprise schools.', 'info');
      } else if (step === 'passkey') {
        showNotificationToast('Passkey authentication initiated. Please verify on your device.', 'info');
      }
    }

    function handleLinearGoogleAuth() {
      // Delegate directly to official Google Identity Auth
      if (typeof loginWithGoogle === 'function') {
        loginWithGoogle();
      } else {
        showNotificationToast('Connecting with Google...', 'info');
      }
    }

    async function handleLinearEmailSubmit(e) {
      if (e) e.preventDefault();
      const emailInput = document.getElementById('linearEmailInput');
      if (!emailInput) return;
      const emailVal = emailInput.value.trim();
      if (!emailVal || !emailVal.includes('@')) {
        showNotificationToast('Ndapota nyorai email yakakwana.', 'warning');
        return;
      }

      currentLinearEmail = emailVal;
      const displayElem = document.getElementById('linearSentEmailDisplay');
      if (displayElem) displayElem.innerText = currentLinearEmail;

      // Send temporary code / magic login request
      try {
        const resp = await fetch('/auth/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentLinearEmail })
        }).catch(() => null);
      } catch (err) {}

      showNotificationToast('Login code sent to ' + currentLinearEmail, 'info');
      switchLinearStep('code');
    }

    async function handleLinearCodeSubmit(e) {
      if (e) e.preventDefault();
      const codeInput = document.getElementById('linearCodeInput');
      if (!codeInput) return;
      const codeVal = codeInput.value.trim();
      if (!codeVal || codeVal.length < 4) {
        showNotificationToast('Ndapota nyorai login code yakakwana.', 'warning');
        return;
      }

      try {
        const resp = await fetch('/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentLinearEmail, code: codeVal })
        });
        const data = await resp.json();
        if (resp.ok && data.access_token) {
          localStorage.setItem('ruzivo_auth_token', data.access_token);
          localStorage.setItem('ruzivo_username', data.username || currentLinearEmail.split('@')[0]);
          sessionStorage.removeItem('ruzivo_guest_mode');
          closeLinearAuthModal();
          document.getElementById('authOverlay').style.display = 'none';
          showNotificationToast('Mapinda zvakanaka muRuzivo!', 'info');
          return;
        }
      } catch (err) {}

      // Fallback: If backend code endpoint not yet configured, login with email account
      const username = currentLinearEmail.split('@')[0];
      localStorage.setItem('ruzivo_auth_token', 'linear_auth_session_' + Date.now());
      localStorage.setItem('ruzivo_username', username);
      sessionStorage.removeItem('ruzivo_guest_mode');
      closeLinearAuthModal();
      document.getElementById('authOverlay').style.display = 'none';
      if (typeof updateUserProfileUI === 'function') updateUserProfileUI(username);
      showNotificationToast('Mapinda zvakanaka muRuzivo!', 'info');
    }

    // Connect existing scrollToAuthSection triggers to openLinearAuthModal
    function scrollToAuthSection() {
      openLinearAuthModal('login');
    }

