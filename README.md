<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4d70e70a-c309-4766-b7ec-96e94a2724f3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Entrance attempt email alerts
Every submitted attempt can send an email containing the attempt number, whether it was correct or wrong, the typed/transcribed answer, time, session ID, and—when the visitor used voice—the original recorded audio as an attachment.

Configure these AI Studio Secrets/environment variables:
- `RESEND_API_KEY` — Resend API key
- `ALERT_EMAIL_TO` — destination email address
- `ALERT_EMAIL_FROM` — verified Resend sender, e.g. `Gothic Gate <alerts@yourdomain.com>`

Create/verify a sender/domain in Resend before using the alert endpoint. Email failure does not block the entrance challenge.
