package com.campusiq.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final String PREFS_NAME = "CampusIQPrefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_OFFLINE_URL = "file:///android_asset/www/login.html";
    private static final String DEFAULT_LAN_URL = "http://10.70.59.52:3000/login";
    private static final String DEFAULT_EMULATOR_URL = "http://10.0.2.2:3000/login";

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorView;
    private TextView errorMessage;
    private TextView statusText;
    private Button btnRefresh;
    private Button btnServer;
    private Button btnInfo;
    private Button btnRetry;
    private Button btnOffline;
    private Button btnChangeServer;

    private SharedPreferences prefs;
    private String currentUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        currentUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_LAN_URL);

        initViews();
        setupWebView();
        setupActions();

        loadCampusIQ(currentUrl);
    }

    private void initViews() {
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        errorView = findViewById(R.id.errorView);
        errorMessage = findViewById(R.id.errorMessage);
        statusText = findViewById(R.id.statusText);
        btnRefresh = findViewById(R.id.btnRefresh);
        btnServer = findViewById(R.id.btnServer);
        btnInfo = findViewById(R.id.btnInfo);
        btnRetry = findViewById(R.id.btnRetry);
        btnOffline = findViewById(R.id.btnOffline);
        btnChangeServer = findViewById(R.id.btnChangeServer);
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("CampusIQ")
                        .setMessage(message)
                        .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                result.confirm();
                            }
                        })
                        .setCancelable(false)
                        .create()
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("CampusIQ")
                        .setMessage(message)
                        .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                result.confirm();
                            }
                        })
                        .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                result.cancel();
                            }
                        })
                        .setCancelable(false)
                        .create()
                        .show();
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                errorView.setVisibility(View.GONE);
                updateStatusHeader(url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                showNetworkError(description + " (" + failingUrl + ")");
            }
        });
    }

    private void updateStatusHeader(String url) {
        if (url.startsWith("file://")) {
            statusText.setText("Mode: Offline Embedded");
        } else if (url.contains("10.0.2.2") || url.contains("localhost") || url.contains("127.0.0.1") || url.contains("10.70.59.52")) {
            statusText.setText("Mode: Local Development");
        } else {
            statusText.setText("Mode: Connected (Cloud/Live)");
        }
    }

    private void setupActions() {
        btnRefresh.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                errorView.setVisibility(View.GONE);
                webView.reload();
                Toast.makeText(MainActivity.this, "Refreshing CampusIQ...", Toast.LENGTH_SHORT).show();
            }
        });

        btnServer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showServerConfigDialog();
            }
        });

        btnInfo.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showProjectInfoDialog();
            }
        });

        btnRetry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                errorView.setVisibility(View.GONE);
                loadCampusIQ(currentUrl);
            }
        });

        btnOffline.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                errorView.setVisibility(View.GONE);
                loadCampusIQ(DEFAULT_OFFLINE_URL);
            }
        });

        btnChangeServer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showServerConfigDialog();
            }
        });
    }

    private void loadCampusIQ(String url) {
        this.currentUrl = url;
        prefs.edit().putString(KEY_SERVER_URL, url).apply();
        errorView.setVisibility(View.GONE);
        webView.loadUrl(url);
    }

    private void showNetworkError(String detail) {
        errorView.setVisibility(View.VISIBLE);
        errorMessage.setText("Unable to connect to: " + currentUrl + "\n\nError: " + detail + "\n\nYou can switch to Offline Embedded Mode or update the server address.");
    }

    private void showServerConfigDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Configure Server Endpoint");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 20, 40, 20);

        TextView prompt = new TextView(this);
        prompt.setText("Enter the backend URL or select a preset:");
        layout.addView(prompt);

        final EditText input = new EditText(this);
        input.setText(currentUrl);
        input.setSingleLine(true);
        layout.addView(input);

        builder.setView(layout);

        builder.setPositiveButton("Connect", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String newUrl = input.getText().toString().trim();
                if (!newUrl.isEmpty()) {
                    loadCampusIQ(newUrl);
                }
            }
        });

        builder.setNeutralButton("Presets", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                showPresetDialog();
            }
        });

        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private void showPresetDialog() {
        final String[] presets = new String[] {
            "Offline Embedded Mode (Standalone)",
            "Local LAN Server (http://10.70.59.52:3000/login)",
            "Android Emulator (http://10.0.2.2:3000/login)",
            "Localhost (http://127.0.0.1:3000/login)"
        };

        final String[] urls = new String[] {
            DEFAULT_OFFLINE_URL,
            "http://10.70.59.52:3000/login",
            DEFAULT_EMULATOR_URL,
            "http://127.0.0.1:3000/login"
        };

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Select Backend Preset");
        builder.setItems(presets, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                loadCampusIQ(urls[which]);
            }
        });
        builder.show();
    }

    private void showProjectInfoDialog() {
        new AlertDialog.Builder(this)
                .setTitle("About CampusIQ")
                .setMessage("CampusIQ - Student Success & Retention Intelligence System\n\n" +
                        "Student Developer:\n" +
                        "• Name: Ankit Kumar Dubey\n" +
                        "• Reg. Number: 251302058\n\n" +
                        "Features:\n" +
                        "• 5 RBAC Portals (Dean, HOD, Batch Head, Mentor, Student)\n" +
                        "• 7-Vector Weighted Student Success Metric\n" +
                        "• Early Warning At-Risk Retention Triggers\n" +
                        "• AI Recovery Notice Draft Generator\n" +
                        "• Accreditation & Benchmark Radar Analytics\n\n" +
                        "Version 1.0.0 (Native Android Build)")
                .setPositiveButton("Close", null)
                .show();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
