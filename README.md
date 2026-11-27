# Blink Buddy — 20-20-20 Eye Break Reminder

A Chrome extension that helps you follow the 20-20-20 rule: every 20 minutes, look at something 20 feet (6 m) away for 20 seconds.

## What it does

- **A break every 20 minutes**, with a soft chime. The eye in the popup slowly closes as the next break nears.
- **A 20-second countdown** while you rest, then it gets out of your way.
- **Over the page you're on (optional):** the break dims the page and pauses any playing video, then resumes it. Works over fullscreen video too.
- **Never missed:** if you're in another app, Chrome is minimised or you're on one of Chrome's own pages, the break opens in its own window that comes to the front. Blink Buddy doesn't rely on system notifications, which Windows can hide.
- **Knows when you're away:** no break while your screen is locked, and a fresh 20 minutes when you come back.
- **Make it yours:** pick the eye or an emoji character and a colour theme, or upload a photo and let Chrome's built-in on-device AI pick a matching character and colours. The toolbar icon, popup and breaks all follow your choice.

## Install from source

1. Clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the cloned folder.

## Permissions

| Permission | Why |
|---|---|
| `alarms` | The 20-minute timer |
| `storage` | Your on/off setting, character and colours |
| `idle` | Skipping breaks while your screen is locked |
| `offscreen` | Playing the chime |
| `scripting` | Showing the break on top of the current page |
| Access to websites (**optional**) | Only asked for when you turn on "Show breaks over the page" in the popup. Used to show the break there and nothing else. |

## Photos and privacy

A photo you upload is looked at on your computer, with Chrome's built-in Gemini Nano when it's available, or by sampling its colours when it isn't. The photo is never uploaded or saved; only the chosen character and colour are kept. Blink Buddy collects no data and makes no network requests. See the [privacy policy](https://sdipanshu.github.io/blink-buddy/privacy.html).

## Build the store package

```
python build.py
```

This writes `dist/blink-buddy-<version>.zip`.
