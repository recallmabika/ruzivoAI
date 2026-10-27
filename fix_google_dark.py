with open("frontend/test_ui.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update initGoogleAuthClient to detect theme dynamically:
old_init_google = """function initGoogleAuthClient() {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          // Render official Google Sign In buttons if containers exist
          const loginContainer = document.getElementById('googleLoginBtnContainer');
          const regContainer = document.getElementById('googleRegisterBtnContainer');
          const customLoginBtn = document.getElementById('customGoogleLoginBtn');
          const customRegBtn = document.getElementById('customGoogleRegisterBtn');

          if (loginContainer) {
            google.accounts.id.renderButton(loginContainer, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 380
            });
            if (customLoginBtn) customLoginBtn.style.display = 'none';
          }

          if (regContainer) {
            google.accounts.id.renderButton(regContainer, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signup_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 380
            });
            if (customRegBtn) customRegBtn.style.display = 'none';
          }
        } catch (e) {
          console.warn('Google Identity Services render error, falling back to custom button:', e);
        }
      }
    }"""

new_init_google = """function initGoogleAuthClient() {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          // Determine dark vs light mode for Google Sign-in button
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
        } catch (e) {
          console.warn('Google Identity Services render error, falling back to custom button:', e);
        }
      }
    }"""

if old_init_google in content:
    content = content.replace(old_init_google, new_init_google)
    print("Replaced initGoogleAuthClient with dark-mode aware renderButton!")
else:
    print("Warning: old_init_google not found by exact match!")

# 2. Add re-render of Google Auth button in selectThemeSegment:
old_select_theme = """        if (mode === 'system') {
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
      }"""

new_select_theme = """        if (mode === 'system') {
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

      // Re-render Google button so it matches light/dark theme seamlessly
      if (typeof initGoogleAuthClient === 'function') {
        initGoogleAuthClient();
      }"""

if old_select_theme in content:
    content = content.replace(old_select_theme, new_select_theme)
    print("Updated selectThemeSegment to re-render Google auth button!")
else:
    print("Warning: old_select_theme not found by exact match!")

# 3. Add CSS for iframe border and container in dark mode to ensure pixel-perfect blending
google_btn_css = """
    /* Google Sign-In Dark Mode Alignment */
    body.theme-dark #googleLoginBtnContainer iframe,
    body.theme-dark #googleRegisterBtnContainer iframe {
      color-scheme: dark;
      border-radius: 6px;
    }

    body.theme-dark #googleLoginBtnContainer,
    body.theme-dark #googleRegisterBtnContainer {
      background: transparent;
      border-radius: 6px;
    }
"""

style_end = content.find("</style>")
content = content[:style_end] + "\n" + google_btn_css + "\n" + content[style_end:]

with open("frontend/test_ui.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Saved frontend/test_ui.html with Google button dark mode support!")
