# Voice recognition fix

The voice challenge was rebuilt around `MediaRecorder` + server-side `gemini-3.5-transcribe`.

Key changes:
- Removed the browser SpeechRecognition dependency.
- Removed the ScriptProcessor/WAV race condition.
- The final MediaRecorder `stop` event now waits for the final audio chunk before uploading.
- Microphone audio is not routed to the speakers, preventing echo/feedback.
- Disabled browser auto-gain/noise suppression/echo cancellation so singing is less distorted.
- Uses `gemini-3.5-transcribe` with `en-IN` and a custom vocabulary containing Billaa/Billa variants.
- The Gemini API key stays server-side.
- The frontend shows the actual transcription before submission.
- Answer matching remains fuzzy but no longer accepts overly broad words such as `bill`.

In Google AI Studio, make sure `GEMINI_API_KEY` is present in Secrets.
The app exposes `/api/health`; it should return `geminiConfigured: true`.
