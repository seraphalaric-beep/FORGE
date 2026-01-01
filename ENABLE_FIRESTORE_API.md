# Enable Firestore API

## Quick Fix

The error message indicates that the Cloud Firestore API needs to be enabled in your Firebase project.

## Step-by-Step Instructions

### Option 1: Direct Link (Easiest)
Click this link to enable Firestore API:
https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=forge-33589

Then click the **"Enable"** button.

### Option 2: Manual Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **forge-33589**
3. Navigate to **APIs & Services** > **Library**
4. Search for **"Cloud Firestore API"**
5. Click on it and press **"Enable"**

### Option 3: Via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **forge-33589**
3. Go to **Firestore Database** in the left sidebar
4. If you see a "Create database" button, click it
5. This will automatically enable the Firestore API

## After Enabling

1. **Wait 1-2 minutes** for the API to propagate
2. **Restart your API service** (the one showing the error)
3. **Try the channel settings command again**

## Verify It's Enabled

You can verify the API is enabled by:
- Going to the [API Library](https://console.cloud.google.com/apis/library?project=forge-33589)
- Searching for "Cloud Firestore API"
- It should show "Enabled" status

