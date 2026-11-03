package com.modarasa.app;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Printer")
public class PrinterPlugin extends Plugin {

    private WebView printView; // يبقى مرجعه حيًّا حتى تنتهي الطباعة

    @PluginMethod
    public void printHtml(final PluginCall call) {
        final String html = call.getString("html");
        final String title = call.getString("title", "Modarasa");
        if (html == null) {
            call.reject("html is required");
            return;
        }
        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (printView != null) {
                        ViewGroup old = (ViewGroup) printView.getParent();
                        if (old != null) old.removeView(printView);
                        printView.destroy();
                        printView = null;
                    }
                    final WebView wv = new WebView(getActivity());
                    wv.setAlpha(0.01f);
                    ((ViewGroup) getActivity().getWindow().getDecorView()).addView(wv, new FrameLayout.LayoutParams(1, 1));
                    wv.getSettings().setAllowFileAccess(true);
                    wv.getSettings().setAllowFileAccessFromFileURLs(true);
                    wv.getSettings().setAllowUniversalAccessFromFileURLs(true);
                    wv.setWebViewClient(new WebViewClient() {
                        private boolean started = false;

                        @Override
                        public void onPageFinished(final WebView view, String url) {
                            if (started) return;
                            started = true;
                            // مهلة قصيرة ليكتمل تحميل الخط قبل فتح نافذة الطباعة
                            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                                @Override
                                public void run() {
                                    try {
                                        PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(title);
                                        PrintAttributes attrs = new PrintAttributes.Builder()
                                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                                .build();
                                        pm.print(title, adapter, attrs);
                                        call.resolve();
                                    } catch (Exception e) {
                                        call.reject("print failed: " + e.getMessage());
                                    }
                                }
                            }, 800);
                        }
                    });
                    printView = wv;
                    wv.loadDataWithBaseURL("file:///android_asset/public/", html, "text/html", "UTF-8", null);
                } catch (Exception e) {
                    call.reject("print failed: " + e.getMessage());
                }
            }
        });
    }
}
