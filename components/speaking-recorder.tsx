"use client";

import { useEffect, useRef, useState } from "react";

interface SpeakingRecorderProps {
  taskId: string;
}

export function SpeakingRecorder({ taskId }: SpeakingRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported] = useState(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined"
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function toggleRecording() {
    if (!isSupported) {
      setError("L'enregistrement audio n'est pas disponible dans ce navigateur.");
      return;
    }

    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return url;
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError("Impossible d'accéder au micro. Vérifie l'autorisation du navigateur.");
    }
  }

  return (
    <div className="recorder" data-task-id={taskId}>
      <div>
        <p className="eyebrow">Oral</p>
        <h4>Auto-review audio</h4>
        <p className="muted">
          Enregistre une prise de parole, puis réécoute-la avant de valider ton transcript.
        </p>
      </div>
      <div className="recorder-actions">
        <button
          className={`button ${isRecording ? "button-danger" : "button-secondary"}`}
          onClick={toggleRecording}
          type="button"
        >
          {isRecording ? "Stopper" : "Enregistrer"}
        </button>
        {audioUrl ? (
          <audio className="recorder-audio" controls src={audioUrl}>
            Ton navigateur ne peut pas lire cet enregistrement.
          </audio>
        ) : null}
      </div>
      {error ? <p className="notice-error">{error}</p> : null}
    </div>
  );
}
