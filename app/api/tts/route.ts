import textToSpeech from "@google-cloud/text-to-speech";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: "./google-tts.json",
});

export async function POST(req: Request) {
  try {
    const { text, language } = await req.json();

    let languageCode = "gu-IN";

    if (language === "hi") languageCode = "hi-IN";

    if (language === "en") languageCode = "en-IN";

    const [response] = await client.synthesizeSpeech({
      input: {
        text,   
      },
      voice: {
        languageCode,
        ssmlGender: "FEMALE",
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    });

    const filename = `${Date.now()}.mp3`;

    const filepath = path.join(
      process.cwd(),
      "public",
      "notifications",
      filename,
    );

    if (!response.audioContent) throw new Error("No audio");

    const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

    fs.writeFileSync(filepath, audioBuffer);

    return NextResponse.json({
      success: true,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/notifications/${filename}`,
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: String(e),
    });
  }
}
