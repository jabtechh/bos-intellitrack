"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import type { AttendanceActionState } from "@/app/attendance/actions";

type Coordinates = { latitude: number; longitude: number; accuracy: number };
type LocationState = "checking" | "captured" | "issue";
type FaceState = "starting" | "no-face" | "multiple" | "too-small" | "off-center" | "valid" | "unsupported" | "error";
type DetectedFace = { boundingBox: { x: number; y: number; width: number; height: number } };
type FaceDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<DetectedFace[]> };
type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorInstance;
export function classifyFaces(faces: DetectedFace[], width: number, height: number): FaceState {
  if (!faces.length) return "no-face";
  if (faces.length > 1) return "multiple";
  const box = faces[0].boundingBox, largeEnough = box.width >= width * .22 && box.height >= height * .22;
  const centerX = box.x + box.width / 2, centerY = box.y + box.height / 2;
  if (!largeEnough) return "too-small";
  if (Math.abs(centerX - width / 2) > width * .22 || Math.abs(centerY - height / 2) > height * .24) return "off-center";
  return "valid";
}

export function EvidenceCapture({ action, label }: { action: (state: AttendanceActionState, data: FormData) => Promise<AttendanceActionState>; label: string }) {
  const [state, formAction, pending] = useActionState(action, { success: false, message: "" });
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("checking");
  const [locationMessage, setLocationMessage] = useState("Checking location...");
  const [faceState, setFaceState] = useState<FaceState>("starting");
  const [cameraMessage, setCameraMessage] = useState("Starting front camera...");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetectorInstance | null>(null);
  const detectionTimer = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (detectionTimer.current !== null) window.clearInterval(detectionTimer.current);
    detectionTimer.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const detectFace = useCallback(async () => {
    const detector = detectorRef.current, video = videoRef.current;
    if (!detector || !video || video.readyState < 2 || !streamRef.current) return;
    try {
      const faces = await detector.detect(video);
      const result = classifyFaces(faces, video.videoWidth, video.videoHeight); setFaceState(result);
      setCameraMessage(result === "no-face" ? "No face detected. Position your face inside the guide." : result === "multiple" ? "Multiple faces detected. Only one person should be visible." : result === "too-small" ? "Move closer to the camera." : result === "off-center" ? "Center your face inside the guide." : "Face detected.");
    } catch { setFaceState("error"); setCameraMessage("Face detection could not continue. Restart the camera and try again."); }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera(); setPhoto(null); setConfirmed(false); setFaceState("starting"); setCameraMessage("Starting front camera...");
    if (!navigator.mediaDevices?.getUserMedia) { setFaceState("unsupported"); setCameraMessage("Live camera capture is not supported by this browser."); return; }
    const Detector = (window as typeof window & { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
    if (!Detector) { setFaceState("unsupported"); setCameraMessage("Face detection is not supported by this browser. Use an updated compatible browser."); return; }
    try {
      detectorRef.current = new Detector({ fastMode: true, maxDetectedFaces: 2 });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); await detectFace(); detectionTimer.current = window.setInterval(() => void detectFace(), 650); }
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setFaceState("error");
      setCameraMessage(name === "NotAllowedError" ? "Camera permission was denied. Allow camera access and try again." : name === "NotFoundError" ? "No front camera was found on this device." : name === "NotReadableError" ? "The camera is already in use by another application." : "The camera could not be started. Try again.");
    }
  }, [detectFace, stopCamera]);

  const checkLocation = useCallback(() => {
    setLocation(null); setLocationState("checking"); setLocationMessage("Checking location...");
    if (!navigator.geolocation) { setLocationState("issue"); setLocationMessage("Location is not supported by this browser."); return; }
    navigator.geolocation.getCurrentPosition(position => {
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
      setLocationState("captured"); setLocationMessage("Location captured."); void startCamera();
    }, error => {
      setLocationState("issue");
      setLocationMessage(error.code === error.PERMISSION_DENIED ? "Location permission was denied." : error.code === error.TIMEOUT ? "Location check timed out." : "Your current location is unavailable.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }, [startCamera]);

  useEffect(() => { const timer = window.setTimeout(checkLocation, 0); return () => { window.clearTimeout(timer); stopCamera(); }; }, [checkLocation, stopCamera]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function capturePhoto() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || faceState !== "valid") return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext("2d"); if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setFaceState("error"); setCameraMessage("The selfie could not be captured. Try again."); return; }
      const file = new File([blob], "attendance-selfie.jpg", { type: "image/jpeg", lastModified: Date.now() });
      if (preview) URL.revokeObjectURL(preview);
      setPhoto(file); setPreview(URL.createObjectURL(file)); setConfirmed(false); stopCamera();
    }, "image/jpeg", .9);
  }

  function retake() { if (preview) URL.revokeObjectURL(preview); setPreview(null); setPhoto(null); setConfirmed(false); void startCamera(); }

  return <form action={data => { if (photo) data.set("selfie", photo); formAction(data); }} className="evidence-form">
    <section className="capture-step" aria-labelledby="location-heading"><div className="capture-step-heading"><span>1</span><div><h3 id="location-heading">Location</h3><p>Current location is requested automatically.</p></div></div><div className={`capture-state capture-${locationState}`} role="status" aria-live="polite"><b aria-hidden="true">{locationState === "captured" ? "✓" : locationState === "issue" ? "!" : "…"}</b><span><strong>{locationMessage}</strong>{locationState === "captured" ? <small>Attendance-area checks are confirmed securely when you submit.</small> : null}</span></div>{locationState === "issue" ? <button type="button" onClick={checkLocation} className="button button-secondary">Retry location</button> : null}</section>
    <input type="hidden" name="latitude" value={location?.latitude ?? ""} /><input type="hidden" name="longitude" value={location?.longitude ?? ""} /><input type="hidden" name="accuracy" value={location?.accuracy ?? ""} />
    <section className="capture-step" aria-labelledby="selfie-heading"><div className="capture-step-heading"><span>2</span><div><h3 id="selfie-heading">Selfie</h3><p>Use a new live photo for this attendance action.</p></div></div>{preview ? <div className="captured-selfie"><Image unoptimized width={720} height={720} src={preview} alt="Captured selfie preview" /><div className="camera-actions"><button type="button" className="button button-secondary" onClick={retake}>Retake</button><button type="button" className="button button-primary" onClick={() => setConfirmed(true)} disabled={confirmed}>{confirmed ? "Photo confirmed" : "Use this photo"}</button></div></div> : <><div className="camera-stage"><video ref={videoRef} playsInline muted aria-label="Live front camera preview" /><div className="face-guide" aria-hidden="true" /></div><canvas ref={canvasRef} hidden/><div className={`face-status face-${faceState}`} role="status" aria-live="polite"><b aria-hidden="true">{faceState === "valid" ? "✓" : faceState === "multiple" || faceState === "no-face" || faceState === "too-small" || faceState === "off-center" ? "!" : "…"}</b>{cameraMessage}</div>{faceState === "error" || faceState === "unsupported" ? <button type="button" className="button button-secondary" onClick={startCamera}>Restart camera</button> : <button type="button" className="button button-secondary capture-selfie" disabled={faceState !== "valid"} onClick={capturePhoto}>Capture selfie</button>}</>}</section>
    <label className="field">Remarks <span>Optional</span><textarea name="remarks" className="min-h-20" /></label>
    {state.message ? <p role="status" className={`inline-notice ${state.success ? "notice-success" : "notice-danger"}`}>{state.message}</p> : null}
    <div className="mobile-action-region"><button disabled={pending || !location || !confirmed || !photo} className="button button-primary w-full">{pending ? "Submitting..." : label}</button></div>
  </form>;
}
