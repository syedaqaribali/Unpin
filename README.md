<div align="center">
  <h1>Universal SSL Pinning Bypass</h1>
  <p><strong>A comprehensive, multi-technique SSL pinning bypass suite for authorized mobile application security testing</strong></p>
  
  <p align="center">
    <img src="https://img.shields.io/badge/Python-3.7+-blue.svg" alt="Python 3.7+"/>
    <img src="https://img.shields.io/badge/Frida-16.0+-red.svg" alt="Frida 16.0+"/>
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License MIT"/>
    <img src="https://img.shields.io/badge/Platform-Android-blueviolet.svg" alt="Platform Android"/>
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/>
  </p>
  
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#techniques-covered">Techniques</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#documentation">Docs</a> •
    <a href="#disclaimer">Disclaimer</a>
  </p>
</div>

---

## ⚠️ Important Legal Notice

> **This tool is intended SOLELY for authorized security professionals conducting legitimate penetration testing, vulnerability assessments, and security research.**
>
> - You MUST have explicit written authorization to test the target application(s)
> - Unauthorized use against applications you do not own or lack permission to test is **illegal**
> - The authors assume NO liability for misuse of this software
> - By using this tool, you agree to use it only for lawful, authorized purposes
>
> See the [DISCLAIMER](#disclaimer) section below for full terms.

---

## Overview

**Universal SSL Pinning Bypass** is a comprehensive, multi-layered bypass suite that attempts **8+ distinct bypass techniques simultaneously** against Android applications. Unlike single-method bypass tools, this suite covers nearly every SSL pinning implementation found in modern Android apps.

### Why This Tool?

| Problem | Solution |
|---------|----------|
| Apps use multiple SSL libraries | Bypasses TrustManager, OkHttp, WebView, Apache, Volley, AndroidAsync simultaneously |
| Pinning implementations vary | 8+ techniques cover all major implementations |
| Some bypasses get patched | Multi-technique approach ensures at least one works |
| Manual bypass is time-consuming | Fully automated, one-command operation |

---

## Features

- **&check; 8 Simultaneous Bypass Techniques** — Covers all major Android SSL implementations
- **&check; Frida-Based Injection** — Runtime hooking without modifying the APK
- **&check; APK Static Patching** — Permanent bypass via `network_security_config.xml` injection
- **&check; Objection Integration** — One-command automated bypass via Objection
- **&check; ADB Proxy Setup** — Full MITM proxy configuration with mitmproxy
- **&check; Frida Server Auto-Install** — Downloads and deploys frida-server to device
- **&check; Interactive Mode** — Choose techniques interactively during testing
- **&check; Standalone Script Mode** — Generate standalone Frida script for manual use

---

## Techniques Covered

| # | Technique | Target | Status |
|---|-----------|--------|--------|
| A | `X509TrustManager` hooks | `checkServerTrusted`, `checkClientTrusted`, `getAcceptedIssuers` | &check; |
| B | `OkHttpClient.Builder` hooks | `sslSocketFactory`, `hostnameVerifier`, `build()` | &check; |
| C | `CertificatePinner` bypass | `CertificatePinner.check()`, `Builder.add()` | &check; |
| D | `WebViewClient` SSL bypass | `onReceivedSslError()` → `handler.proceed()` | &check; |
| E | Apache HTTP client | `SSLSocketFactory.createSocket()` | &check; |
| F | AndroidAsync (Koushik) | `SSLUTls.createCertificate()` | &check; |
| G | Volley | `HurlStack.createConnection()` | &check; |
| H | Network Security Config | `isCleartextTrafficPermitted()` runtime hook | &check; |
| I | APK Static Patch | `AndroidManifest.xml` + `network_security_config.xml` injection | &check; |
| J | Objection | `android sslpinning disable` | &check; |

---

## Quick Start

### Prerequisites

```bash
# Required
pip install frida-tools
sudo apt install adb apktool

# Optional but recommended
pip install objection
sudo apt install mitmproxy
