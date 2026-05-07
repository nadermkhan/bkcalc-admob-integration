// Status messages are written into the #bannerContainer element so
// they're visible on-device without needing remote WebView debugging.
// Once the native AdMob banner loads, it overlays this area.

function setBannerStatus(text) {
  try {
    var el = document.getElementById('bannerContainer');
    if (el) el.textContent = text;
  } catch (e) {}
  try {
    console.log('[admob]', text);
  } catch (e) {}
}

setBannerStatus('AdMob: script loaded, waiting for cordova...');

document.addEventListener('deviceready', async function () {
  setBannerStatus('AdMob: deviceready, checking plugin...');

  if (typeof admob === 'undefined') {
    setBannerStatus('AdMob: plugin not available (admob is undefined)');
    return;
  }

  try {
    if (typeof admob.addEventListener === 'function') {
      admob.addEventListener('banner.load', function () {
        setBannerStatus('AdMob: banner loaded');
      });
      admob.addEventListener('banner.loadfail', function (evt) {
        var msg = 'AdMob: banner load failed';
        try { msg += ' - ' + JSON.stringify(evt); } catch (e) {}
        setBannerStatus(msg);
      });
      admob.addEventListener('banner.impression', function () {
        setBannerStatus('AdMob: banner impression');
      });
    }

    setBannerStatus('AdMob: starting SDK...');
    await admob.start();

    setBannerStatus('AdMob: SDK started, creating banner...');
    var banner = new admob.BannerAd({
      // Google's official test banner unit. Swap for the real unit before release.
      adUnitId: 'ca-app-pub-3940256099942544/6300978111',
      position: 'bottom',
    });

    setBannerStatus('AdMob: calling banner.show()...');
    await banner.show();
    setBannerStatus('AdMob: banner.show() resolved, waiting for ad...');
  } catch (err) {
    var msg = 'AdMob: error';
    if (err && err.message) {
      msg += ' - ' + err.message;
    } else {
      try { msg += ' - ' + JSON.stringify(err); } catch (e) { msg += ' - ' + String(err); }
    }
    setBannerStatus(msg);
  }
}, false);
