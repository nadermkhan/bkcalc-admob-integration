// AdMob banner integration via emi-indo-cordova-plugin-admob.
// Status messages are written into the #bannerContainer element so they're
// visible on-device without needing remote WebView debugging. Once the native
// AdMob banner loads, it overlays this area.
//
// Reference: https://github.com/EMI-INDO/emi-indo-cordova-plugin-admob

(function () {
  // Google's official Android test banner unit. Swap for the real unit before
  // release. See https://developers.google.com/admob/android/test-ads
  var TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

  function setBannerStatus(text) {
    try {
      var el = document.getElementById('bannerContainer');
      if (el) el.textContent = text;
    } catch (e) {}
    try {
      console.log('[admob]', text);
    } catch (e) {}
  }

  function getPlugin() {
    if (typeof cordova === 'undefined') return null;
    if (!cordova.plugins) return null;
    return cordova.plugins.emiAdmobPlugin || null;
  }

  function loadBanner(plugin) {
    setBannerStatus('AdMob: loading banner...');
    try {
      plugin.loadBannerAd({
        adUnitId: TEST_BANNER_AD_UNIT_ID,
        position: 'bottom-center',
        size: 'adaptive',
        collapsible: false,
        autoShow: true,
        isOverlapping: false,
      });
    } catch (e) {
      setBannerStatus('AdMob: loadBannerAd threw: ' + ((e && e.message) || e));
    }
  }

  function registerBannerEvents() {
    document.addEventListener('on.banner.load', function () {
      setBannerStatus('AdMob: banner loaded');
    });

    document.addEventListener('on.banner.failed.load', function (evt) {
      var msg = 'AdMob: banner load failed';
      try { msg += ' - ' + JSON.stringify(evt); } catch (e) {}
      setBannerStatus(msg);
    });

    document.addEventListener('on.banner.impression', function () {
      setBannerStatus('AdMob: banner impression');
    });
  }

  setBannerStatus('AdMob: script loaded, waiting for cordova...');

  document.addEventListener('deviceready', function () {
    setBannerStatus('AdMob: deviceready, checking plugin...');

    var plugin = getPlugin();
    if (!plugin) {
      setBannerStatus('AdMob: plugin not available (cordova.plugins.emiAdmobPlugin missing)');
      return;
    }

    registerBannerEvents();

    document.addEventListener('on.sdkInitialization', function (data) {
      var version = (data && data.version) || 'unknown';
      setBannerStatus('AdMob: SDK initialized v' + version + ', loading banner...');
      loadBanner(plugin);
    });

    setBannerStatus('AdMob: initializing SDK...');
    try {
      plugin.initialize({
        isUsingAdManagerRequest: false,
        isResponseInfo: true,
        isConsentDebug: true,
      });
    } catch (e) {
      setBannerStatus('AdMob: initialize() threw: ' + ((e && e.message) || e));
      return;
    }

    // Fallback: if on.sdkInitialization never fires (e.g., no Play Services),
    // still try to load the banner after a short delay so we get a visible
    // failure mode instead of an endless "initializing SDK..." status.
    setTimeout(function () {
      var statusEl = document.getElementById('bannerContainer');
      var current = statusEl ? statusEl.textContent : '';
      if (current && current.indexOf('initializing SDK') !== -1) {
        setBannerStatus('AdMob: init event missing, attempting banner anyway...');
        loadBanner(plugin);
      }
    }, 8000);
  }, false);
})();
