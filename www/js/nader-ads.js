document.addEventListener('deviceready', async () => {
    // 1. Initialize the AdMob Plus plugin
    if (typeof admob !== 'undefined') {
        try {
            await admob.start();
            console.log('AdMob initialized successfully');
            
            // 2. Configure and load the Banner Ad
            const banner = new admob.BannerAd({
                // TODO: Swap with the real Ad Unit ID before compiling release APK/AAB
                adUnitId: 'ca-app-pub-3940256099942544/6300978111', 
                position: 'bottom',
            });

            await banner.show();
            console.log('Banner ad displayed');

        } catch (err) {
            console.error('AdMob initialization or rendering failed:', err);
        }
    } else {
        console.warn('AdMob plugin not found. Are you running on a device/emulator?');
    }
}, false);