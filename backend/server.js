import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

const CAPTURE_DIR = path.join(process.cwd(), "captures");

if (!fs.existsSync(CAPTURE_DIR)) {
  fs.mkdirSync(CAPTURE_DIR);
}

app.post("/capture", async (req, res) => {

  const { url, format } = req.body;

  if (!url) {
    return res.status(400).json({
      error: "Missing URL"
    });
  }

  let browser;

  try {

    browser = await chromium.launch({
      headless: true
    });

    const page = await browser.newPage({
      viewport: {
        width: 1280,
        height: 2000
      }
    });

    await page.goto(url, {
      waitUntil: "networkidle"
    });

    await page.waitForTimeout(3000);

    const title = await page.evaluate(() => {

      const titleEl = document.querySelector(
        '[data-test-id="pin-title-wrapper"] h1'
      );

      if (!titleEl) return "untitled";

      return titleEl.textContent.trim();

    });

    const fileName = title
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 100);

    const webmPath = path.join(
      CAPTURE_DIR,
      `${fileName}.webm`
    );

    await page.evaluate(async () => {

      const FPS = 30;
      const DURATION = 5;

      const canvas = document.querySelector(
        'canvas[data-test-id="shuffle-renderer-canvas"]'
      );

      if (!canvas) {
        window.__COLLAGE_ERROR__ = "Canvas not found";
        return;
      }

      const stream = canvas.captureStream(FPS);

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm"
      });

      const chunks = [];

      window.__COLLAGE_DONE__ = false;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {

        const blob = new Blob(chunks, {
          type: "video/webm"
        });

        const arrayBuffer = await blob.arrayBuffer();

        window.__COLLAGE_VIDEO__ = Array.from(
          new Uint8Array(arrayBuffer)
        );

        window.__COLLAGE_DONE__ = true;
      };

      recorder.start();

      setTimeout(() => {
        recorder.stop();
      }, DURATION * 1000);

    });

    await page.waitForFunction(() => {
      return window.__COLLAGE_DONE__ === true;
    }, {
      timeout: 15000
    });

    const videoData = await page.evaluate(() => {
      return window.__COLLAGE_VIDEO__;
    });

    fs.writeFileSync(
      webmPath,
      Buffer.from(videoData)
    );

    let outputPath = webmPath;

    if (format === "mp4") {

      outputPath = path.join(
        CAPTURE_DIR,
        `${fileName}.mp4`
      );

      execSync(
        `ffmpeg -y -i "${webmPath}" -c:v libx264 "${outputPath}"`
      );

    }

    if (format === "gif") {

      const palettePath = path.join(
        CAPTURE_DIR,
        `${fileName}_palette.png`
      );

      outputPath = path.join(
        CAPTURE_DIR,
        `${fileName}.gif`
      );

      execSync(
        `ffmpeg -y -i "${webmPath}" -vf "fps=15,scale=720:-1:flags=lanczos,palettegen" "${palettePath}"`
      );

      execSync(
        `ffmpeg -y -i "${webmPath}" -i "${palettePath}" -filter_complex "fps=15,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse" "${outputPath}"`
      );

      if (fs.existsSync(palettePath)) {
        fs.unlinkSync(palettePath);
      }

    }

    res.download(outputPath, () => {

      try {

        if (fs.existsSync(webmPath)) {
          fs.unlinkSync(webmPath);
        }

        if (
          outputPath !== webmPath &&
          fs.existsSync(outputPath)
        ) {
          fs.unlinkSync(outputPath);
        }

      } catch (err) {
        console.error(err);
      }

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  } finally {

    if (browser) {
      await browser.close();
    }

  }

});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});