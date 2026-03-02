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
import { verifyPhoto, analyzeFrame } from "../src/services/visionService";
import {
  startSession,
  saveSessionStep,
  completeSession,
  checkAndUnlockAchievements,
  getSettings,
} from "../src/services/storageService";
import { getTimeOfDay } from "../src/utils/dateUtils";
import {
  VisionResult,
  RoutineStepDefinition,
  SessionRecord,
  SessionStepResult,
  FrameAnalysisContext,
  BrushingQuadrant,
} from "../src/types";
import {
  FULL_ROUTINE_STEPS,
  QUADRANT_SEQUENCE,
  STEP_TYPE_METADATA,
} from "../src/constants/routines";

type StepPhase = "camera" | "verifying" | "result";

// Assign IDs to the routine steps
const ROUTINE_STEPS: RoutineStepDefinition[] = FULL_ROUTINE_STEPS.map(
  (s, i) => ({
    ...s,
    id: `${s.type}_${i}`,
  })
);

export default function VerifyScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const timeOfDay = getTimeOfDay();

  // --- Flow state ---
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<StepPhase>("camera");
  const isComplete = stepIndex >= ROUTINE_STEPS.length;
  const currentStep = ROUTINE_STEPS[stepIndex] as
    | RoutineStepDefinition
    | undefined;

  // --- Per-step state ---
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Session tracking ---
  const sessionRef = useRef<SessionRecord | null>(null);
  const stepStartRef = useRef<string>(new Date().toISOString());

  // --- AI coaching ---
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [aiCoachingEnabled, setAiCoachingEnabled] = useState(false);
  const frameInFlightRef = useRef(false);
  const frameCountRef = useRef(0);
  const coachingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const coachingDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const COACHING_INTERVAL_MS = 10_000;
  const MAX_FRAMES_PER_STEP = 12;

  // --- Derived timer values ---
  const hasDuration = currentStep?.durationSeconds != null;
  const totalDuration = currentStep?.durationSeconds || 0;
  const timerComplete = hasDuration && timerSeconds === 0;
  const timerProgress = totalDuration > 0 ? 1 - timerSeconds / totalDuration : 0;
  const captureDisabled = hasDuration && !timerComplete;

  // --- Quadrant coaching (derived from timer) ---
  const hasQuadrantCoaching =
    hasDuration && currentStep?.hasQuadrantCoaching === true;
  const elapsed = totalDuration - timerSeconds;
  const quadrantDuration =
    hasQuadrantCoaching ? totalDuration / QUADRANT_SEQUENCE.length : 0;
  const currentQuadrantIndex = hasQuadrantCoaching
    ? Math.min(
        Math.floor(elapsed / quadrantDuration),
        QUADRANT_SEQUENCE.length - 1
      )
    : 0;
  const currentQuadrant = hasQuadrantCoaching
    ? QUADRANT_SEQUENCE[currentQuadrantIndex]
    : null;
  const quadrantRemaining = hasQuadrantCoaching
    ? Math.ceil(quadrantDuration - (elapsed - currentQuadrantIndex * quadrantDuration))
    : 0;

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // --- Initialize session on mount ---
  useEffect(() => {
    (async () => {
      const session = await startSession(timeOfDay, "full_routine");
      sessionRef.current = session;
      const settings = await getSettings();
      setAiCoachingEnabled(settings.aiCoachingEnabled);
    })();
  }, []);

  // --- Reset per-step state when stepIndex changes ---
  useEffect(() => {
    if (!currentStep) return;
    setPhotoUri(null);
    setResult(null);
    setCoachingTip(null);
    stepStartRef.current = new Date().toISOString();
    frameCountRef.current = 0;

    if (currentStep.durationSeconds) {
      setTimerSeconds(currentStep.durationSeconds);
      setTimerActive(true);
    } else {
      setTimerSeconds(0);
      setTimerActive(false);
    }
  }, [stepIndex]);

  // --- Countdown timer ---
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

  // --- Real-time AI coaching ---
  useEffect(() => {
    const shouldCoach =
      phase === "camera" &&
      hasDuration &&
      aiCoachingEnabled &&
      !timerComplete;

    if (shouldCoach) {
      coachingIntervalRef.current = setInterval(async () => {
        if (frameInFlightRef.current) return;
        if (frameCountRef.current >= MAX_FRAMES_PER_STEP) return;
        if (!cameraRef.current || !currentStep) return;

        frameInFlightRef.current = true;
        frameCountRef.current++;

        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.4,
            base64: false,
          });
          if (!photo) return;

          const context: FrameAnalysisContext = {
            stepType: currentStep.type,
            stepLabel: currentStep.label,
            currentQuadrant: currentQuadrant?.quadrant as
              | BrushingQuadrant
              | undefined,
            elapsedSeconds: totalDuration - timerSeconds,
            previousFeedback: coachingTip || undefined,
            frameIndex: frameCountRef.current,
          };

          const frameResult = await analyzeFrame(photo.uri, context);
          if (frameResult.coachingTip) {
            setCoachingTip(frameResult.coachingTip);
            if (coachingDismissRef.current) {
              clearTimeout(coachingDismissRef.current);
            }
            coachingDismissRef.current = setTimeout(
              () => setCoachingTip(null),
              5000
            );
          }
        } catch (e) {
          // Coaching errors should never disrupt the flow
        } finally {
          frameInFlightRef.current = false;
        }
      }, COACHING_INTERVAL_MS);
    }

    return () => {
      if (coachingIntervalRef.current) {
        clearInterval(coachingIntervalRef.current);
        coachingIntervalRef.current = null;
      }
    };
  }, [stepIndex, phase, aiCoachingEnabled, timerComplete]);

  // --- Cleanup coaching dismiss timeout ---
  useEffect(() => {
    return () => {
      if (coachingDismissRef.current) {
        clearTimeout(coachingDismissRef.current);
      }
    };
  }, []);

  // --- Photo capture & verification ---
  const takePhoto = async () => {
    if (!cameraRef.current || !currentStep) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.7,
      base64: false,
    });
    if (!photo) return;

    setPhotoUri(photo.uri);
    setPhase("verifying");

    const visionResult = await verifyPhoto(photo.uri, currentStep.type);
    setResult(visionResult);

    const verified =
      visionResult.verified && visionResult.confidence !== "low";

    if (verified && sessionRef.current) {
      const actualElapsed = currentStep.durationSeconds
        ? currentStep.durationSeconds - timerSeconds
        : Math.round(
            (Date.now() - new Date(stepStartRef.current).getTime()) / 1000
          );

      const stepResult: SessionStepResult = {
        stepId: currentStep.id,
        stepType: currentStep.type,
        stepLabel: currentStep.label,
        verified: true,
        confidence: visionResult.confidence,
        feedback: visionResult.feedback,
        coachingMessages: [],
        durationActualSeconds: actualElapsed,
        completedAt: new Date().toISOString(),
        photoUri: photo.uri,
      };
      await saveSessionStep(sessionRef.current.id, stepResult);
      await checkAndUnlockAchievements();
    }

    setPhase("result");
  };

  // --- Navigation between steps ---
  const handleNext = async () => {
    if (phase !== "result") return;
    const verified = result?.verified && result?.confidence !== "low";

    if (verified) {
      const nextIndex = stepIndex + 1;
      if (nextIndex >= ROUTINE_STEPS.length) {
        if (sessionRef.current) {
          await completeSession(sessionRef.current.id);
        }
        setStepIndex(nextIndex);
      } else {
        setStepIndex(nextIndex);
        setPhase("camera");
      }
    } else {
      // Retry
      setPhotoUri(null);
      setResult(null);
      setPhase("camera");
    }
  };

  // --- Helper: instruction text per step ---
  function getInstruction(): string {
    if (!currentStep) return "";
    if (currentStep.durationSeconds != null) {
      if (timerComplete) {
        return `Time's up! Take a selfie with your ${currentStep.label.toLowerCase()} visible.`;
      }
      const mins = Math.floor(currentStep.durationSeconds / 60);
      return `${currentStep.label} for ${mins} minute${mins !== 1 ? "s" : ""}. The camera is your mirror!`;
    }
    const hints: Record<string, string> = {
      floss:
        "Take a selfie while flossing. Make sure your hands and teeth are visible!",
      tongue_scrape:
        "Scrape your tongue and take a selfie. Show the scraper and your tongue!",
      mouthwash:
        "Swish mouthwash and take a selfie. Show the mouthwash bottle!",
    };
    return (
      hints[currentStep.type] || `Complete ${currentStep.label} and take a photo.`
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (!permission)
    return <View style={{ flex: 1, backgroundColor: "#FAFFFE" }} />;

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
          We need your camera to verify your dental hygiene routine!
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

  // --- Complete screen ---
  if (isComplete) {
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

  // --- Verifying screen (loading) ---
  if (phase === "verifying") {
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
          Verifying {currentStep?.label.toLowerCase()}...
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

  // --- Result screen ---
  if (phase === "result") {
    const verified = result?.verified && result?.confidence !== "low";
    const nextStep = ROUTINE_STEPS[stepIndex + 1];
    const nextButtonText = verified
      ? nextStep
        ? `Next: ${nextStep.label}`
        : "Complete!"
      : "Try Again";

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
          {verified
            ? `${currentStep?.label} Verified!`
            : `${currentStep?.label} Not Detected`}
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
            {nextButtonText}
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

  // --- Camera screen ---
  const stepIcon = STEP_TYPE_METADATA[currentStep!.type].icon;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
        {/* Top overlay: step progress + instructions */}
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
            Step {stepIndex + 1} of {ROUTINE_STEPS.length}:{" "}
            {currentStep!.label}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              paddingBottom: 16,
            }}
          >
            {getInstruction()}
          </Text>
        </View>

        {/* Quadrant coaching overlay */}
        {hasQuadrantCoaching && !timerComplete && phase === "camera" && (
          <View
            style={{
              position: "absolute",
              top: "30%",
              alignSelf: "center",
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: 16,
              padding: 16,
              alignItems: "center",
              minWidth: 200,
            }}
          >
            {/* 2x2 quadrant grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                width: 160,
                marginBottom: 12,
              }}
            >
              {QUADRANT_SEQUENCE.map((q, i) => (
                <View
                  key={q.quadrant}
                  style={{
                    width: 76,
                    height: 44,
                    margin: 2,
                    borderRadius: 8,
                    backgroundColor:
                      i === currentQuadrantIndex
                        ? "#34D399"
                        : "rgba(255,255,255,0.15)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color:
                        i === currentQuadrantIndex
                          ? "#0F172A"
                          : "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontWeight: i === currentQuadrantIndex ? "700" : "400",
                    }}
                  >
                    {q.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text
              style={{
                color: "#34D399",
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              {currentQuadrant?.label}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              {quadrantRemaining}s remaining
            </Text>
          </View>
        )}

        {/* Coaching tip overlay */}
        {coachingTip && phase === "camera" && (
          <View
            style={{
              position: "absolute",
              bottom: hasDuration ? 200 : 140,
              alignSelf: "center",
              backgroundColor: "rgba(52, 211, 153, 0.9)",
              borderRadius: 20,
              paddingVertical: 10,
              paddingHorizontal: 20,
              maxWidth: "85%",
            }}
          >
            <Text
              style={{
                color: "#0F172A",
                fontSize: 14,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {coachingTip}
            </Text>
          </View>
        )}

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
          {/* Timer display - timed steps only */}
          {hasDuration && (
            <View
              style={{
                alignItems: "center",
                marginBottom: 16,
                width: "100%",
              }}
            >
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
            onPress={captureDisabled ? undefined : takePhoto}
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
            <Text style={{ fontSize: 32 }}>{stepIcon}</Text>
          </TouchableOpacity>
          <Text
            style={{
              color: timerComplete ? "#34D399" : "#FFF",
              fontSize: 14,
              marginTop: 8,
              fontWeight: "600",
            }}
          >
            {hasDuration
              ? timerComplete
                ? "Tap to capture"
                : "Keep going..."
              : "Tap to capture"}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}
