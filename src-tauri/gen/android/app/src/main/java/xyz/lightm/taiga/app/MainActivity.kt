package xyz.lightm.taiga.app

import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.core.view.WindowCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { view, insets ->
            val systemBarHeight = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom
            val imeHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom

            view.setPadding(view.paddingLeft, view.paddingTop, view.paddingRight, if (imeHeight > 0) imeHeight else systemBarHeight)

            // Return the insets so other listeners can consume them too
            insets
        }

        setStatusBarTextColor()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        setStatusBarTextColor() // Reset status bar text color
    }

    private fun setStatusBarTextColor() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val decorView = window.decorView
            var uiOptions = decorView.systemUiVisibility
            // Get whether the current theme is a dark theme
            val nightModeFlags = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            val isDarkMode = nightModeFlags == Configuration.UI_MODE_NIGHT_YES
            if (isDarkMode) {
                // If it is dark mode, set light text (remove SYSTEM_UI_FLAG_LIGHT_STATUS_BAR)
                uiOptions = uiOptions and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            } else {
                // If it is light mode, set dark text
                uiOptions = uiOptions or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            }
            decorView.systemUiVisibility = uiOptions
        }
    }
}