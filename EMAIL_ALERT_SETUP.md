# Email alert setup & audio recording attachments

For every entrance attempt (voice or typed), the server dispatches an email notification to `kmsiddesh009@gmail.com`.

## Email Structure

### Subject
- Voice attempt: `🧛 Gothic Gate — Voice Attempt #<number> — <CORRECT/WRONG>`
- Typed attempt: `🧛 Gothic Gate — Typed Attempt #<number> — <CORRECT/WRONG>`

### Body
```text
Someone attempted to enter the Gothic Gate.

Attempt: #2
Method: VOICE
Result: ❌ WRONG

What was heard:
"My name is Rahul"

Time:
30 August 2026, 4:32 PM

Total attempts:
2

🎙️ Original voice recording:
ATTACHED (gothic-attempt-02-voice.webm)
```

## Voice Recording Attachment
- The **exact original audio recorded from the visitor's microphone** is captured via `MediaRecorder` (`audio/webm`, `audio/wav`, `audio/ogg`, or `audio/mp4`).
- Named dynamically by attempt: `gothic-attempt-01-voice.webm`, `gothic-attempt-02-voice.webm`, `gothic-attempt-03-voice.webm`, etc.
- Each voice attempt is saved and attached as a separate, distinct audio file.
- Typed attempts include the typed text in the email with no audio attachment.

## Secrets in AI Studio
- `RESEND_API_KEY`: Your Resend API key (mandatory for sending).
- `ALERT_EMAIL_TO`: `kmsiddesh009@gmail.com`
- `ALERT_EMAIL_FROM`: `Gothic Gate <onboarding@resend.dev>` or your custom verified domain.
