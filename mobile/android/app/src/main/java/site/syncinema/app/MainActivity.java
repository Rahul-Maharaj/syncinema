package site.syncinema.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
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

        // 📱 Notch-Free Display & Screen-to-Body Ratio:
        // Ensure web content renders below the system status bar and camera punch-hole cutout
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            // Never allow window to overlap with display cutout/notch
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_NEVER;
        }

        // Pre-emptively request camera and microphone permissions on Android 6+ (API 23+)
        // so WebRTC media capture is granted at the OS level immediately when the app launches
        requestMediaPermissionsIfNeeded();

        // Customise WebView for 60FPS hardware-accelerated playback on low-end devices, notch padding, and WebRTC calls
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            
            // 🚀 Maximum Hardware Acceleration for Budget & Older Android Devices (Mali/Adreno GPUs)
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setOffscreenPreRaster(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            }

            // Dynamically push WebView below system status bar and hardware camera notch
            webView.setFitsSystemWindows(true);
            androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
                androidx.core.graphics.Insets insets = windowInsets.getInsets(
                    androidx.core.view.WindowInsetsCompat.Type.systemBars() |
                    androidx.core.view.WindowInsetsCompat.Type.displayCutout()
                );
                v.setPadding(0, insets.top, 0, 0);
                return windowInsets;
            });

            // Set custom WebChromeClient inheriting from BridgeWebChromeClient
            // to ensure Capacitor file upload, fullscreen video, and JS dialogs work,
            // while WebRTC video/audio capture requests are directly granted!
            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        boolean needCam = false;
                        boolean needAudio = false;
                        for (String r : request.getResources()) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && !hasCameraPermission()) {
                                needCam = true;
                            }
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && !hasAudioPermission()) {
                                needAudio = true;
                            }
                        }

                        if (needCam || needAudio) {
                            pendingWebPermissionRequest = request;
                            requestMediaPermissionsIfNeeded();
                        } else {
                            request.grant(request.getResources());
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

    private boolean hasCameraPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasAudioPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasMediaPermissions() {
        return hasCameraPermission() && hasAudioPermission();
    }

    private void requestMediaPermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> needed = new ArrayList<>();
            if (!hasCameraPermission()) {
                needed.add(Manifest.permission.CAMERA);
            }
            if (!hasAudioPermission()) {
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
                    List<String> toGrant = new ArrayList<>();
                    for (String r : req.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) {
                            if (hasCameraPermission()) toGrant.add(r);
                        } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                            if (hasAudioPermission()) toGrant.add(r);
                        } else {
                            toGrant.add(r);
                        }
                    }
                    if (!toGrant.isEmpty()) {
                        req.grant(toGrant.toArray(new String[0]));
                    } else {
                        req.deny();
                    }
                });
            }
        }
    }
}
