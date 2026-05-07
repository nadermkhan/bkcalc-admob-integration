#!/usr/bin/env python3
"""Patch admob-plus-cordova alpha.19 to work around a hang in admob.start().

Background
----------
On some Android devices the Mobile Ads SDK's
OnInitializationCompleteListener never fires, so the plugin's
executeStart() never resolves the Cordova callback. Because every JS-side
ad call (banner.show, interstitial.load, etc.) awaits admob.start()
through MobileAd._init(), this leaves the entire ads pipeline hanging
forever with no error.

See: https://github.com/admob-plus/admob-plus/issues/460
     https://github.com/admob-plus/admob-plus/issues/682
     https://github.com/admob-plus/admob-plus/issues/709

Workaround
----------
Resolve the Cordova callback immediately after kicking off
MobileAds.initialize(), instead of inside the listener. Per the AdMob
docs MobileAds.initialize() is not mandatory before loading ads, so
this only changes when start() returns to JS.

Run after `npm install` and before `cordova platform add android`, so
that when Cordova copies the plugin's Kotlin sources into
platforms/android the patched version is what ends up in the APK.
"""

from __future__ import annotations

import pathlib
import sys

KT_PATH = pathlib.Path(
    "node_modules/admob-plus-cordova/src/android/cordova/AdMob.kt"
)

MARKER = "PATCHED_BY_BKCALC_INITHANG"

OLD = """    private fun executeStart(ctx: ExecuteContext) {
        if (sdkReady) {
            ctx.resolve(mapOf("version" to MobileAds.getVersion()))
            return
        }
        MobileAds.initialize(ctx.activity) {
            configForTestLabIfNeeded(ctx.activity)
            ctx.resolve(mapOf("version" to MobileAds.getVersion()))
        }
        sdkReady = true
    }"""

NEW = """    // PATCHED_BY_BKCALC_INITHANG see https://github.com/admob-plus/admob-plus/issues/460
    private fun executeStart(ctx: ExecuteContext) {
        if (sdkReady) {
            ctx.resolve(mapOf("version" to MobileAds.getVersion()))
            return
        }
        MobileAds.initialize(ctx.activity) {
            configForTestLabIfNeeded(ctx.activity)
        }
        configForTestLabIfNeeded(ctx.activity)
        sdkReady = true
        ctx.resolve(mapOf("version" to MobileAds.getVersion()))
    }"""


def main() -> int:
    if not KT_PATH.is_file():
        print(f"ERROR: {KT_PATH} not found. Did `npm install` run?", file=sys.stderr)
        return 1

    src = KT_PATH.read_text()

    if MARKER in src:
        print(f"{KT_PATH}: already patched, skipping")
        return 0

    if OLD not in src:
        print(
            f"ERROR: expected executeStart() block not found in {KT_PATH}.\n"
            "The plugin source has changed; review and update this patch.",
            file=sys.stderr,
        )
        return 2

    KT_PATH.write_text(src.replace(OLD, NEW))
    print(f"{KT_PATH}: patched executeStart()")
    return 0


if __name__ == "__main__":
    sys.exit(main())
