// AdMob banner integration via emi-indo-cordova-plugin-admob.
//
// Reference: https://github.com/EMI-INDO/emi-indo-cordova-plugin-admob

(function () {
  // Google's official Android test banner unit. Swap for the real unit before
  // release. See https://developers.google.com/admob/android/test-ads
  var NADER_AD_UNIT_ID = 'ca-app-pub-3139819978975551/7764030861';

  function log(text) {
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
    try {
      plugin.loadBannerAd({
        adUnitId: NADER_AD_UNIT_ID,
        position: 'bottom-center',
        size:  'BANNER', 
        collapsible: false,
        autoShow: true,
        isOverlapping: true,
      });
    } catch (e) {
      log('loadBannerAd threw: ' + ((e && e.message) || e));
    }
  }

  function registerBannerEvents() {
    document.addEventListener('on.banner.load', function () {
      log('banner loaded');
    });

    document.addEventListener('on.banner.failed.load', function (evt) {
      var msg = 'banner load failed';
      try { msg += ' - ' + JSON.stringify(evt); } catch (e) {}
      log(msg);
    });

    document.addEventListener('on.banner.impression', function () {
      log('banner impression');
    });
  }

  document.addEventListener('deviceready', function () {
    var plugin = getPlugin();
    if (!plugin) {
      log('plugin not available (cordova.plugins.emiAdmobPlugin missing)');
      return;
    }

    registerBannerEvents();

    var initialized = false;
    document.addEventListener('on.sdkInitialization', function (data) {
      initialized = true;
      var version = (data && data.version) || 'unknown';
      log('SDK initialized v' + version);
      loadBanner(plugin);
    });

    try {
      plugin.initialize({
        isUsingAdManagerRequest: false,
        isResponseInfo: false,
        isConsentDebug: false,
      });
    } catch (e) {
      log('initialize() threw: ' + ((e && e.message) || e));
      return;
    }

    // Fallback: if on.sdkInitialization never fires (e.g., no Play Services),
    // still try to load the banner after a short delay.
    setTimeout(function () {
      if (!initialized) {
        log('init event missing, attempting banner anyway');
        loadBanner(plugin);
      }
    }, 8000);
  }, false);
})();
