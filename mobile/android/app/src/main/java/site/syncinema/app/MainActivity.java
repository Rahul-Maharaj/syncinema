package site.syncinema.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int MEDIA_PERMISSION_REQ_CODE = 1010;
    private PermissionRequest pendingWebPermissionRequest = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Pre-emptively request camera and microphone permissions on Android 6+ (API 23+)
        // so WebRTC media capture is granted at the OS level immediately when the app launches
        requestMediaPermissionsIfNeeded();

        // Customise WebView for zero-drift playback and WebRTC video/audio calls
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setDatabaseEnabled(true);

            // Set custom WebChromeClient inheriting from BridgeWebChromeClient
            // to ensure Capacitor file upload, fullscreen video, and JS dialogs work,
            // while WebRTC video/audio capture requests are directly granted!
            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (hasMediaPermissions()) {
                            request.grant(request.getResources());
                        } else {
                            pendingWebPermissionRequest = request;
                            requestMediaPermissionsIfNeeded();
                        }
                    });
                }

                @Override
                public void onPermissionRequestCanceled(PermissionRequest request) {
                    if (pendingWebPermissionRequest == request) {
                        pendingWebPermissionRequest = null;
                    }
                    super.onPermissionRequestCanceled(request);
                }
            });
        }
    }

    private boolean hasMediaPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestMediaPermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> needed = new ArrayList<>();
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.CAMERA);
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.RECORD_AUDIO);
            }
            if (!needed.isEmpty()) {
                ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), MEDIA_PERMISSION_REQ_CODE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MEDIA_PERMISSION_REQ_CODE) {
            if (pendingWebPermissionRequest != null) {
                final PermissionRequest req = pendingWebPermissionRequest;
                pendingWebPermissionRequest = null;
                runOnUiThread(() -> {
                    if (hasMediaPermissions()) {
                        req.grant(req.getResources());
                    } else {
                        req.deny();
                    }
                });
            }
        }
    }
}
