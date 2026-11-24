"use client";
// DEC-2026-019 — camera-only face photo capture, embedded in Getting started (/onboarding). There is no file
// picker: the selfie comes from the live front camera inside a server-issued,
// single-use capture session.
import Image from "next/image";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { startIdentityCapture, submitIdentityReference, type IdentityActionState } from "@/app/identity/actions";
import { classifyFaces } from "@/app/attendance/evidence-capture";
import { createBrowserFaceDetector, type BrowserFaceDetector } from "@/lib/attendance/browser-face-detector";

type CameraState = "idle" | "starting" | "no-face" | "multiple" | "too-small" | "off-center" | "valid" | "error";
const GUIDANCE: Record<CameraState, string> = {
  idle: "Start the camera when you are ready.", starting: "Starting the camera...", "no-face": "No face detected. Position your face inside the guide.",
  multiple: "Only you should be visible in the frame.", "too-small": "Move closer to the camera.", "off-center": "Center your face inside the guide.", valid: "Face detected. Hold still and capture.", error: "",
};

export function IdentityEnrollment({ replacement }: { replacement: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(async (previous: IdentityActionState, data: FormData) => {
    const result = await submitIdentityReference(previous, data);
    if (!result.success) setToken(null);
    return result;
  }, { success: false, message: "" });
  const [consent, setConsent] = useState(false), [camera, setCamera] = useState<CameraState>("idle"), [error, setError] = useState("");
  const [photo, setPhoto] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null), streamRef = useRef<MediaStream | null>(null), detectorRef = useRef<BrowserFaceDetector | null>(null), timer = useRef<number | null>(null), run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1; if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; detectorRef.current?.close(); detectorRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const start = useCallback(async () => {
    stop(); const current = run.current; setPhoto(null); setPreview(null); setToken(null); setError(""); setCamera("starting");
    if (!navigator.mediaDevices?.getUserMedia) { setCamera("error"); setError("This browser cannot open the camera. Use Chrome on your Android phone."); return; }
    try {
      const detector = await createBrowserFaceDetector(); if (current !== run.current) { detector.close(); return; } detectorRef.current = detector;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      if (current !== run.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream; if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const session = await startIdentityCapture("ENROLLMENT"); if (current !== run.current) return;
      if (!session.ok) { stop(); setCamera("error"); setError(session.message); return; }
      setToken(session.token);
      const check = () => {
        if (current !== run.current || !detectorRef.current || !videoRef.current) return;
        const video = videoRef.current;
        if (video.readyState >= 2) { try { setCamera(classifyFaces(detectorRef.current.detect(video, performance.now()), video.videoWidth, video.videoHeight)); } catch { setCamera("error"); setError("Face guidance stopped. Select Try again."); return; } }
        timer.current = window.setTimeout(check, 250);
      };
      check();
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : ""; stop(); setCamera("error");
      setError(name === "NotAllowedError" ? "Camera permission was denied. Allow camera access for this site in your browser settings (Site settings → Camera), then select Try again."
        : name === "NotFoundError" ? "No front camera was found on this device. Use a phone with a front camera."
        : name === "NotReadableError" ? "The camera is being used by another app. Close it, then select Try again."
        : "The camera could not start. Select Try again.");
    }
  }, [stop]);

  function capture() {
    const video = videoRef.current, canvas = canvasRef.current; if (!video || !canvas || camera !== "valid") return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight; const context = canvas.getContext("2d"); if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { setCamera("error"); setError("The photo could not be captured. Select Try again."); return; }
      const file = new File([blob], "face-photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
      setPhoto(file); setPreview(URL.createObjectURL(file)); stop();
    }, "image/jpeg", 0.92);
  }

  if (state.success) return <p role="status" className="inline-notice notice-success">{state.message}</p>;
  return <form className="evidence-form" action={(data) => { if (photo) data.set("selfie", photo); formAction(data); }}>
    <section className="capture-step" aria-labelledby="consent-heading">
      <div className="capture-step-heading"><span>1</span><div><h3 id="consent-heading">Consent</h3><p>Read how your face photo is used.</p></div></div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
        <li>Your photo is biometric (sensitive personal) information under the Data Privacy Act of 2012.</li>
        <li>It is used only to confirm that you are the person recording your own Time In and Time Out.</li>
        <li>It is encrypted and stored privately. Only you and your assigned Company Supervisor can view it.</li>
        <li>It is checked automatically for one clear face and saved straight away. A later update is saved only if it matches your current photo; otherwise your Supervisor can reset it.</li>
        <li>Replaced or reset photos are deleted; a record of the change is kept.</li>
        <li>Matching is automated and can be wrong. Uncertain Time In and Time Out results go to your Supervisor, never to automatic rejection of your hours.</li>
      </ul>
      <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" name="consent" value="accepted" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I understand and consent to the use of my face photo for attendance verification.</label>
    </section>
    <section className="capture-step" aria-labelledby="capture-heading">
      <div className="capture-step-heading"><span>2</span><div><h3 id="capture-heading">Live face photo</h3><p>Face the camera in good light, remove sunglasses or masks, and make sure only you are in the frame.</p></div></div>
      {preview ? <div className="captured-selfie"><Image unoptimized width={720} height={720} src={preview} alt="Captured face photo preview" /><div className="camera-actions"><button type="button" className="button button-secondary" onClick={() => void start()}>Retake</button></div></div>
        : <>
          <div className="camera-stage" hidden={camera === "idle" || camera === "error"}><video ref={videoRef} playsInline muted aria-label="Live front camera preview" /><div className="face-guide" aria-hidden="true" /></div>
          <canvas ref={canvasRef} hidden />
          <div className={`face-status face-${camera === "valid" ? "valid" : camera === "error" ? "error" : "starting"}`} role="status" aria-live="polite">{camera === "error" ? error : GUIDANCE[camera]}</div>
          {camera === "idle" ? <button type="button" className="button button-secondary" disabled={!consent} onClick={() => void start()}>Start camera</button>
            : camera === "error" ? <button type="button" className="button button-secondary" onClick={() => void start()}>Try again</button>
            : <button type="button" className="button button-secondary capture-selfie" disabled={camera !== "valid" || !token} onClick={capture}>Capture photo</button>}
        </>}
    </section>
    <input type="hidden" name="captureToken" value={token ?? ""} />
    {state.message ? <p role="status" className="inline-notice notice-danger">{state.message}{!token ? " Select Retake to start a new capture." : null}</p> : null}
    <div className="mobile-action-region"><button className="button button-primary w-full" disabled={pending || !consent || !photo || !token}>{pending ? "Checking and saving securely..." : replacement ? "Update face photo" : "Save face photo"}</button></div>
  </form>;
}
