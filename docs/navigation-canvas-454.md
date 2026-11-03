# iOS transition under-page canvas — 454

The supplied 2026-11-03 11:54 recording is4.30s,1206x2622,60fps. Local extraction shows a full-page history swipe from Application/updates to Settings, including duplicated bottom navigation and rounded viewport corners. A light underlay becomes visible at the edges/corners. It is consistent with the native history snapshot transition; the app's own edge gesture translates only the main content and cannot produce that full-page duplicate. This visual inference does not independently identify the precise internal WebKit layer.

453 has an opaque dark root but transparent body. Apple documents that WKWebView's default underPageBackgroundColor derives from html/body background colors and the web-view background: https://developer.apple.com/documentation/webkit/wkwebview/underpagebackgroundcolor . The current theme-color is already#070b16.

454 makes both document root and body explicitly opaque#070b16. body isolation keeps the existing negative-z atmosphere/scenery children within its painting context so the new body background does not cover Home imagery. No native source, gesture interception, touch-action, overscroll, router, permissions or stored-data changes. This is a CSS correction to the page's underlay, not a claim to have directly controlled the installed PWA's native view.

A self-only localhost fixture uses actual wallpaper/weather modules and packaged assets with synthetic settings, no production account or network data. On402x874,453 computed body is transparent/auto isolation;454 is opaque/isolate. The repaired fixture still visibly renders Khujand scenery. Native history-swipe corners cannot be accepted in the desktop Chromium runner; the owner must repeat the same swipe on the installed iPhone after publication. Do not claim the video defect is proven absent until that retest.

Original453 copy remains ../salah-account-security-453/app. The supplied video was read locally only; no external upload or original media edits. Contact sheet and transition frame are evidence outside the shipped app.
