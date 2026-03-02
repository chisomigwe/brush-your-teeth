import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";
import {
  VisionResult,
  VerificationStep,
  FrameAnalysisResult,
  FrameAnalysisContext,
} from "../types";

const ANTHROPIC_API_KEY =
  Constants.expoConfig?.extra?.ANTHROPIC_API_KEY ||
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  "";

const API_URL = "https://api.anthropic.com/v1/messages";

function getPromptForStep(step: VerificationStep): string {
  switch (step) {
    case "floss":
      return `Analyze this selfie-style photo. Is this person flossing their teeth? Look for:
- Floss or interdental cleaner visible between or near teeth
- Hands positioned near the mouth as if flossing
- Teeth and hands visible in the frame

Respond with JSON only:
{"verified": boolean, "confidence": "high" | "medium" | "low", "feedback": "brief explanation"}

If you cannot clearly determine flossing, set verified to false and give helpful feedback like "Make sure your floss and teeth are visible in the photo."`;

    case "brush":
      return `Analyze this selfie-style photo. Is this person brushing their teeth? Look for:
- A toothbrush visible in or near the mouth
- Person appears to be in the act of brushing
- Bathroom/mirror setting is acceptable context

Respond with JSON only:
{"verified": boolean, "confidence": "high" | "medium" | "low", "feedback": "brief explanation"}

If you cannot clearly determine brushing, set verified to false and give helpful feedback like "Make sure your toothbrush and teeth are visible in the photo."`;

    case "tongue_scrape":
      return `Analyze this selfie-style photo. Is this person scraping or cleaning their tongue? Look for:
- A tongue scraper or toothbrush being used on the tongue
- Person's tongue extended or visible
- Hands positioned near the mouth

Respond with JSON only:
{"verified": boolean, "confidence": "high" | "medium" | "low", "feedback": "brief explanation"}

If you cannot clearly determine tongue scraping, set verified to false and give helpful feedback like "Make sure your tongue scraper and tongue are visible in the photo."`;

    case "mouthwash":
      return `Analyze this selfie-style photo. Is this person using mouthwash? Look for:
- A mouthwash bottle visible in the frame
- Person's cheeks puffed as if swishing, or holding a cup of mouthwash
- Signs of rinsing activity

Respond with JSON only:
{"verified": boolean, "confidence": "high" | "medium" | "low", "feedback": "brief explanation"}

If you cannot clearly determine mouthwash use, set verified to false and give helpful feedback like "Make sure the mouthwash bottle is visible, or show yourself swishing."`;

    default:
      return `Analyze this selfie-style photo. Is this person performing an oral hygiene activity? Look for signs of dental care.

Respond with JSON only:
{"verified": boolean, "confidence": "high" | "medium" | "low", "feedback": "brief explanation"}`;
  }
}

export async function verifyPhoto(
  photoUri: string,
  step: VerificationStep
): Promise<VisionResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: "base64",
    });

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64,
                },
              },
              {
                type: "text",
                text: getPromptForStep(step),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vision API error:", errorText);
      return {
        verified: false,
        confidence: "low",
        feedback: "Unable to verify right now. Please try again.",
      };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        verified: result.verified === true,
        confidence: result.confidence || "low",
        feedback: result.feedback || "Verification complete.",
      };
    }

    return {
      verified: false,
      confidence: "low",
      feedback: "Could not process the image. Please try again.",
    };
  } catch (error) {
    console.error("Vision verification error:", error);
    return {
      verified: false,
      confidence: "low",
      feedback: "An error occurred. Please try again.",
    };
  }
}

// --- Real-time coaching frame analysis ---

function getCoachingPrompt(context: FrameAnalysisContext): string {
  const quadrantHint = context.currentQuadrant
    ? `They should currently be brushing their ${context.currentQuadrant.replace(/_/g, " ")}.`
    : "";

  return `You are an AI dental hygiene coach. Analyze this frame from a live brushing session.

Context:
- Activity: ${context.stepLabel}
- Elapsed: ${context.elapsedSeconds} seconds
${quadrantHint ? `- ${quadrantHint}` : ""}
${context.previousFeedback ? `- Previous tip: "${context.previousFeedback}"` : ""}

Provide a brief, encouraging coaching tip (max 15 words). Focus on technique, angle, or coverage. Vary your tips — don't repeat the previous one.

Respond with JSON only:
{"coachingTip": "string or null", "activityDetected": boolean}

If the person is not visible or not brushing, set activityDetected to false and give a gentle reminder as coachingTip.`;
}

export async function analyzeFrame(
  photoUri: string,
  context: FrameAnalysisContext
): Promise<FrameAnalysisResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: "base64",
    });

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 128,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64,
                },
              },
              {
                type: "text",
                text: getCoachingPrompt(context),
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        verified: true,
        confidence: "low",
        feedback: "",
        activityDetected: true,
      };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*?\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        verified: true,
        confidence: "medium",
        feedback: "",
        coachingTip: result.coachingTip || undefined,
        activityDetected: result.activityDetected !== false,
      };
    }

    return {
      verified: true,
      confidence: "low",
      feedback: "",
      activityDetected: true,
    };
  } catch (error) {
    console.error("Frame analysis error:", error);
    return {
      verified: true,
      confidence: "low",
      feedback: "",
      activityDetected: true,
    };
  }
}
