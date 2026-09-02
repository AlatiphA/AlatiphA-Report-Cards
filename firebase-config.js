// AlatiphA Report Cards — Firebase configuration
//
// Teacher accounts/login are OPTIONAL and OFF by default. To turn them on:
//
// 1. Go to https://console.firebase.google.com and create a free project.
// 2. In the project, go to Build → Authentication → Sign-in method,
//    and enable "Email/Password".
// 3. Go to Project settings (gear icon) → General → "Your apps" →
//    click the web icon (</>) to register a web app.
// 4. Firebase will show you a firebaseConfig object — copy its values
//    into the object below, replacing the placeholder strings.
// 5. Save this file and redeploy. The app will detect real values are
//    present and show the sign-in screen automatically.
//
// Until you do this, every value below stays as a placeholder, the app
// detects that, and skips accounts entirely — it works exactly as it
// does today, fully local, no sign-in screen.

window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID"
};
