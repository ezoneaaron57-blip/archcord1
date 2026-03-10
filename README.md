# 🐧 ArchCord

A fully functional Discord-like chat app with Arch Linux / KDE Plasma aesthetic.  
Real-time messaging powered by Firebase.

## Features
- ✅ User accounts (register/login via Firebase Auth)
- ✅ Multiple servers (like Discord guilds) — create for Family, Friends, School
- ✅ Multiple channels per server
- ✅ Real-time messaging (Firestore onSnapshot)
- ✅ Direct Messages (1-on-1)
- ✅ File & image sharing (Firebase Storage)
- ✅ Emoji reactions on messages
- ✅ Typing indicators
- ✅ Online/offline presence
- ✅ Delete your own messages
- ✅ Unread message badges

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/archcordv1.git
cd archcordv1
npm install
```

### 2. Set up Firebase

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `archcord`
3. Once created, click **Web** (`</>`) to add a web app
4. Copy the `firebaseConfig` object

5. Enable **Authentication**:
   - Go to Build → Authentication → Get started
   - Enable **Email/Password** provider

6. Enable **Firestore**:
   - Go to Build → Firestore Database → Create database
   - Start in **test mode** (you can add security rules later)
   - Choose a region (e.g. `asia-southeast1` for Malaysia)

7. Enable **Storage**:
   - Go to Build → Storage → Get started
   - Start in **test mode**

### 3. Add your Firebase config

Open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "your-api-key",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123",
}
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173/archcordv1/](http://localhost:5173/archcordv1/)

### 5. Deploy to GitHub Pages

```bash
npm run deploy
```

Then go to your repo → Settings → Pages → set source to `gh-pages` branch.

Your app: `https://YOUR_USERNAME.github.io/archcordv1/`

---

## Firestore Security Rules (recommended before sharing)

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /servers/{serverId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid in resource.data.members;
    }
    match /servers/{serverId}/channels/{channelId} {
      allow read, write: if request.auth != null;
    }
    match /servers/{serverId}/channels/{channelId}/messages/{msgId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if request.auth.uid == resource.data.uid;
    }
    match /dms/{dmId}/{document=**} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == dmId.split('_')[0] || request.auth.uid == dmId.split('_')[1]);
    }
  }
}
```

---

## Invite Friends

1. Create a server
2. Click the ⚙ icon in the channels sidebar  
3. Copy your **Server ID**
4. Send it to your friend — they can join by entering the ID (join flow coming soon)

---

## Tech Stack

- **React 18** + **Vite**
- **Firebase** (Auth, Firestore, Storage)
- **Zustand** (state management)
- **date-fns** (timestamps)
- **gh-pages** (deployment)
