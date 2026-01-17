# MelodyTransfer

> **World Class Bidirectional Music Transfer Tool**
> Seamlessly transfer playlists and liked songs between **Spotify** and **YouTube Music**.

> [!NOTE]
> **Status**: Beta. requires setting up `.env` with valid API credentials.

## 🚀 Features

- **Bidirectional Transfer**: Move music from Spotify to YouTube Music AND YouTube Music to Spotify.
- **Detailed Progress**: UI shows real-time transfer steps.
- **Smart Matching**: Fuzzy logic matches songs across platforms (Artist + Track Name).
- **Secure**: Tokens stored in HttpOnly cookies.


## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Google Fonts (Outfit)](https://fonts.google.com/)
- **State Management**: React Hooks (Context API if needed)
- **Authentication**: OAuth 2.0 (Spotify API & Google Data API)

## ⚠️ Important Limitations (Read First)

This project uses the official Spotify and YouTube APIs in **Development/Testing Mode**. This imposes strict security limitations:

### 1. Spotify "User not registered in the Developer Dashboard"
-   **Issue**: By default, Spotify apps in Development Mode only allow **up to 25 specific users** to log in.
-   **Fix**: You must manually add the email address of any user you want to test with to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) -> Settings -> User Management.
-   **Production**: To allow *anyone* to log in, you must submit the app for a "Quota Extension" review by Spotify.

### 2. YouTube "Access Blocked: App has not completed the Google verification process"
-   **Issue**: Similar to Spotify, Google restricts unverified apps to "Test Users" only.
-   **Fix**: You must add the email address of the test user to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent) -> OAuth Consent Screen -> Test Users.
-   **Quota**: The YouTube Data API has a daily quota of 10,000 units. A transfer consumes quota for each search and addition. If hit, the app will pause transfers for 24 hours.

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/melody-transfer.git
   cd melody-transfer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # Spotify Credentials
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   # NOTE: The route handles both auth initiation and callback
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify

   # YouTube (Google) Credentials
   YOUTUBE_CLIENT_ID=your_google_client_id
   YOUTUBE_CLIENT_SECRET=your_google_client_secret
   # NOTE: The route handles both auth initiation and callback
   YOUTUBE_REDIRECT_URI=http://localhost:3000/api/auth/youtube
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

## 🔒 Security & Best Practices

- **Token Security**: Access tokens are stored in HTTP-Only cookies where possible or secure session storage.
- **Input Validation**: All API routes validate input to prevent injection attacks.
- **No Secrets in Client**: Client-side code only uses public keys or proxies requests through API routes.

## ❓ Troubleshooting

### Spotify "INVALID_CLIENT: Invalid redirect URI"
If you see this error, it means the Redirect URI in your Spotify Dashboard does not **exactly** match the one the app is using.
-   **Solution**: Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) -> Settings -> Edit.
-   Add `http://localhost:3000/api/auth/spotify` to the Redirect URIs list.
-   Save and try again.

## 📂 Project Structure

```
melody-transfer/
├── app/                  # Next.js App Router
│   ├── api/              # Backend API Routes
│   ├── globals.css       # Global Styles & Tailwind Directives
│   ├── layout.js         # Root Layout
│   └── page.js           # Landing Page
├── components/           # Reusable UI Components
├── lib/                  # Utility Functions (Spotify/YT Logic)
└── public/               # Static Assets
```
