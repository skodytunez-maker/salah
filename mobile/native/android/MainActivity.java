package com.saadikobilov.salah;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before BridgeActivity creates the WebView and native plugin headers.
        registerPlugin(SalahWidgetPlugin.class);
        registerPlugin(SalahSupportPhotoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
