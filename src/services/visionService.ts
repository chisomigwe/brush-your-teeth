import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";
import { VisionResult, VerificationStep } from "../types";

const ANTHROPIC_API_KEY =
  Constants.expoConfig?.extra?.ANTHROPIC_API_KEY ||
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  "";

const API_URL = "https://api.anthropic.com/v1/messages";

function getPromptForStep(step: VerificationStep): string {
  if (step === "floss") {
    return `Analyze this selfie-style photo. Is this person flossing their teeth? Look for:
- Floss or interdental cleaner visible between or near teeth
- Hands positioned near the mouth as if flossing
- Teeth and hands visible in the frame

Respond with JSON only:
{"verified": boolean, "confidence": "high" | "medium" | "low", "feedback": "brief explanation"}

If you cannot clearly determine flossing, set verified to false and give helpful feedback like "Make sure your floss and teeth are visible in the photo."`;
  }

  return `Analyze this selfie-style photo. Is this person brushing their teeth? Look for:
- A toothbrush visible in or near the mouth
- Person appears to be in the act of brushing
- Bathroom/mirror setting is acceptable context

Respond with JSON only:
{"verified": boolean, "confidence": "high" | "medium" | "low", "feedback": "brief explanation"}

If you cannot clearly determine brushing, set verified to false and give helpful feedback like "Make sure your toothbrush and teeth are visible in the photo."`;
}

export async function verifyPhoto(
  photoUri: string,
  step: VerificationStep
): Promise<VisionResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
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

    // Parse JSON from response
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
