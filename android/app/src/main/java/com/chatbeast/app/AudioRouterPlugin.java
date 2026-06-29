package com.chatbeast.app;

import android.content.Context;
import android.media.AudioManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioRouterPlugin")
public class AudioRouterPlugin extends Plugin {

    @PluginMethod
    public void setSpeakerOn(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", false);
        Context context = getContext();
        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);

        if (audioManager != null) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(enabled);
        }

        call.resolve();
    }
}
