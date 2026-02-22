import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { verifyPhoto } from "../src/services/visionService";
import { markVerified } from "../src/services/storageService";
import {
  checkAndUnlockAchievements,
} from "../src/services/storageService";
import { getTimeOfDay } from "../src/utils/dateUtils";
import { VisionResult, VerificationStep } from "../src/types";

type FlowState =
  | "camera_floss"
  | "verifying_floss"
  | "floss_result"
  | "camera_brush"
  | "verifying_brush"
  | "brush_result"
  | "complete";

export default function VerifyScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<FlowState>("camera_floss");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeOfDay = getTimeOfDay();

  const TIMER_DURATION = 120; // 2 minutes in seconds

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Start timer when entering brush camera step
  useEffect(() => {
    if (state === "camera_brush") {
      setTimerSeconds(TIMER_DURATION);
      setTimerActive(true);
    } else {
      setTimerActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  // Countdown logic
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, timerSeconds > 0]);

  const timerComplete = state === "camera_brush" && timerSeconds === 0;
  const timerProgress = 1 - timerSeconds / TIMER_DURATION;

  const takePhoto = async (step: VerificationStep) => {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: false,
    });

    if (!photo) return;

    setPhotoUri(photo.uri);
    setState(step === "floss" ? "verifying_floss" : "verifying_brush");

    const visionResult = await verifyPhoto(photo.uri, step);
    setResult(visionResult);

    if (
      visionResult.verified &&
      visionResult.confidence !== "low"
    ) {
      await markVerified(step, timeOfDay, visionResult.confidence, photo.uri);
      await checkAndUnlockAchievements();
    }

    setState(step === "floss" ? "floss_result" : "brush_result");
  };

  const handleNext = () => {
    if (state === "floss_result" && result?.verified) {
      setResult(null);
      setPhotoUri(null);
      setState("camera_brush");
    } else if (state === "floss_result") {
      setResult(null);
      setPhotoUri(null);
      setState("camera_floss");
    } else if (state === "brush_result" && result?.verified) {
      setState("complete");
    } else if (state === "brush_result") {
      setResult(null);
      setPhotoUri(null);
      setState("camera_brush");
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: "#FAFFFE" }} />;

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FAFFFE",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#0F172A",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Camera permission needed
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#64748B",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          We need your camera to verify that you're actually brushing and
          flossing!
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: "#34D399",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
            Grant Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Complete state
  if (state === "complete") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#FAFFFE",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        <Text style={{ fontSize: 72 }}>🎉</Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: "#059669",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          All verified!
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#64748B",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Great job! Your {timeOfDay} routine is complete.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#34D399",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
            marginTop: 32,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Verifying state (loading)
  if (state === "verifying_floss" || state === "verifying_brush") {
    const step = state === "verifying_floss" ? "flossing" : "brushing";
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0F172A",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={{
              width: 200,
              height: 200,
              borderRadius: 16,
              marginBottom: 24,
              opacity: 0.6,
            }}
          />
        )}
        <ActivityIndicator size="large" color="#34D399" />
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: "700",
            marginTop: 16,
          }}
        >
          Verifying {step}...
        </Text>
        <Text
          style={{
            color: "#94A3B8",
            fontSize: 14,
            marginTop: 8,
          }}
        >
          AI is checking your photo
        </Text>
      </View>
    );
  }

  // Result state
  if (state === "floss_result" || state === "brush_result") {
    const verified = result?.verified && result?.confidence !== "low";
    const step = state === "floss_result" ? "Flossing" : "Brushing";

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: verified ? "#059669" : "#E11D48",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        <Text style={{ fontSize: 72 }}>{verified ? "✅" : "❌"}</Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: "#FFFFFF",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          {verified ? `${step} Verified!` : `${step} Not Detected`}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.8)",
            marginTop: 8,
            textAlign: "center",
            paddingHorizontal: 20,
          }}
        >
          {result?.feedback || ""}
        </Text>
        <TouchableOpacity
          onPress={handleNext}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
            marginTop: 32,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.4)",
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
            {verified
              ? state === "floss_result"
                ? "Next: Brush"
                : "Complete!"
              : "Try Again"}
          </Text>
        </TouchableOpacity>

        {!verified && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Camera state
  const isFlossStep = state === "camera_floss";
  const isBrushStep = state === "camera_brush";
  const stepLabel = isFlossStep ? "Floss" : "Brush";
  const stepNumber = isFlossStep ? "1" : "2";
  const instruction = isFlossStep
    ? "Take a selfie while flossing. Make sure your hands and teeth are visible!"
    : timerComplete
      ? "Time's up! Take a selfie with your toothbrush visible."
      : "Brush for 2 minutes. The camera is your mirror!";

  const captureDisabled = isBrushStep && !timerComplete;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="front"
      >
        {/* Top overlay */}
        <View
          style={{
            paddingTop: 60,
            paddingHorizontal: 20,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: 8 }}
          >
            <Text style={{ color: "#FFF", fontSize: 16 }}>✕ Close</Text>
          </TouchableOpacity>
          <Text
            style={{
              color: "#FFF",
              fontSize: 14,
              fontWeight: "600",
              marginBottom: 4,
            }}
          >
            Step {stepNumber} of 2: {stepLabel}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              paddingBottom: 16,
            }}
          >
            {instruction}
          </Text>
        </View>

        {/* Bottom section: timer + capture button */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingBottom: 50,
            backgroundColor: "rgba(0,0,0,0.3)",
            paddingTop: 20,
          }}
        >
          {/* Timer display - brush step only */}
          {isBrushStep && (
            <View style={{ alignItems: "center", marginBottom: 16, width: "100%" }}>
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: "800",
                  color: timerComplete ? "#34D399" : "#FFFFFF",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatTime(timerSeconds)}
              </Text>

              {/* Progress bar */}
              <View
                style={{
                  width: "80%",
                  height: 6,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderRadius: 3,
                  marginTop: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${timerProgress * 100}%`,
                    height: "100%",
                    backgroundColor: timerComplete ? "#34D399" : "#A7F3D0",
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          )}

          {/* Capture button */}
          <TouchableOpacity
            onPress={
              captureDisabled
                ? undefined
                : () => takePhoto(isFlossStep ? "floss" : "brush")
            }
            activeOpacity={captureDisabled ? 1 : 0.7}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: captureDisabled
                ? "rgba(52, 211, 153, 0.3)"
                : "#34D399",
              borderWidth: 4,
              borderColor: captureDisabled
                ? "rgba(255,255,255,0.3)"
                : "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              opacity: captureDisabled ? 0.4 : 1,
            }}
          >
            <Text style={{ fontSize: 32 }}>
              {isFlossStep ? "🧵" : "🪥"}
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: timerComplete ? "#34D399" : "#FFF",
              fontSize: 14,
              marginTop: 8,
              fontWeight: "600",
            }}
          >
            {isBrushStep
              ? timerComplete
                ? "Tap to capture"
                : "Keep brushing..."
              : "Tap to capture"}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}
