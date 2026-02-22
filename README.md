# Brush Your Teeth

The app that won't leave you alone until you brush and floss. Camera-verified dental hygiene accountability, morning and night.

## How It Works

1. Set your morning and evening schedule
2. Get a notification when it's time to brush
3. Open the app and take a selfie while flossing — AI verifies you're actually doing it
4. Take another selfie while brushing — AI verifies again
5. Notifications stop until your next scheduled time
6. Build streaks and earn badges!

## Tech Stack

- React Native with Expo (managed workflow)
- Expo Router for navigation
- Expo Camera for photo capture
- Expo Notifications for reminders
- Claude Vision API for photo verification
- AsyncStorage for local data persistence
- NativeWind (Tailwind CSS) for styling

## Setup

```bash
# Install dependencies
npm install

# Copy env file and add your API key
cp .env.example .env

# Start the development server
npx expo start
```

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | Anthropic API key for Claude Vision verification |

## Run Tests

```bash
npx jest
```

## Build for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## Color Palette

- Mint: `#34D399`
- Fresh White: `#FAFFFE`
- Navy: `#0F172A`
- Coral (urgency): `#FB7185`

Built by Igwe Studios.
