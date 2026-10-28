import os
import subprocess
import shutil

BUILD_DIR = os.path.abspath('scripts/apk_build')
SRC_DIR = os.path.join(BUILD_DIR, 'src', 'com', 'ruzivo', 'app')
RES_DIR = os.path.join(BUILD_DIR, 'res')
DRAWABLE_DIR = os.path.join(RES_DIR, 'drawable')
VALUES_DIR = os.path.join(RES_DIR, 'values')
BIN_DIR = os.path.join(BUILD_DIR, 'bin')

os.makedirs(SRC_DIR, exist_ok=True)
os.makedirs(DRAWABLE_DIR, exist_ok=True)
os.makedirs(VALUES_DIR, exist_ok=True)
os.makedirs(BIN_DIR, exist_ok=True)

# Copy logo to drawable
if os.path.exists('frontend/assets/logo.png'):
    shutil.copyfile('frontend/assets/logo.png', os.path.join(DRAWABLE_DIR, 'ic_launcher.png'))
elif os.path.exists('assets/logo.png'):
    shutil.copyfile('assets/logo.png', os.path.join(DRAWABLE_DIR, 'ic_launcher.png'))

# 1. Strings & Styles XML
with open(os.path.join(VALUES_DIR, 'strings.xml'), 'w', encoding='utf-8') as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Ruzivo AI</string>
</resources>
''')

with open(os.path.join(VALUES_DIR, 'styles.xml'), 'w', encoding='utf-8') as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">#0F172A</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
''')

# 2. AndroidManifest.xml
manifest_path = os.path.join(BUILD_DIR, 'AndroidManifest.xml')
with open(manifest_path, 'w', encoding='utf-8') as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.ruzivo.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
''')

# 3. MainActivity.java
java_src_path = os.path.join(SRC_DIR, 'MainActivity.java')
with open(java_src_path, 'w', encoding='utf-8') as f:
    f.write('''package com.ruzivo.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView mWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mWebView = new WebView(this);
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setAllowFileAccess(true);

        mWebView.setWebViewClient(new WebViewClient());
        mWebView.setWebChromeClient(new WebChromeClient());
        mWebView.loadUrl("https://ruzivo-ai.tech/");
        setContentView(mWebView);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if ((keyCode == KeyEvent.KEYCODE_BACK) && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
''')

print("Source files written successfully.")
