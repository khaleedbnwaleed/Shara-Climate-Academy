'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  AlertTriangle,
  Bot,
  Globe,
  Leaf,
  Loader2,
  LogIn,
  Mic,
  Send,
  Square,
  User,
} from 'lucide-react';

interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ha', name: 'Hausa' },
  { code: 'ig', name: 'Igbo' },
  { code: 'yo', name: 'Yoruba' },
];

// BCP-47 tags for the browser's Web Speech API fallback.
const BROWSER_SPEECH_TAGS: Record<string, string> = {
  en: 'en-NG',
  ha: 'ha-NG',
  ig: 'ig-NG',
  yo: 'yo-NG',
};

const STARTER_QUESTIONS = [
  'What is climate change?',
  'How can I reduce waste at home?',
  'Explain renewable energy simply.',
  'Menene canjin yanayi?',
];

const MAX_RECORDING_SECONDS = 60;

// Minimal typings for the Web Speech API (not in lib.dom for all targets).
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export default function ClimateTutor() {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice-note state.
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [browserSpeechAvailable, setBrowserSpeechAvailable] = useState(false);
  const [useBrowserSpeech, setUseBrowserSpeech] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const browserSpeechRef = useRef<SpeechRecognitionLike | null>(null);
  const languageRef = useRef(language);
  languageRef.current = language;

  useEffect(() => {
    // auth state is restored asynchronously; re-check when it settles.
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setIsSignedIn(!!firebaseUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setBrowserSpeechAvailable(Boolean(Ctor));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading, isTranscribing]);

  // Stop any live recording/speech when the component unmounts.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      browserSpeechRef.current?.abort();
    };
  }, []);

  const askQuestion = async (question: string) => {
    if (!question.trim() || loading) return;

    setMessages((items) => [...items, { id: `${Date.now()}-u`, role: 'user', content: question }]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Please sign in again to use the tutor.');
      }

      const response = await fetch('/api/natlas-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message: question, language }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        answer?: string;
        error?: string;
      };

      if (response.status === 503) {
        // N-ATLAS is not configured yet — voice notes should use the browser's
        // own speech recognition immediately instead of recording first.
        if (browserSpeechAvailable) setUseBrowserSpeech(true);
        throw new Error(
          data.error || 'The tutor is not configured yet. Please try again later.'
        );
      }

      if (!response.ok) {
        throw new Error(data.error || 'The tutor is unavailable right now. Please try again later.');
      }

      setMessages((items) => [
        ...items,
        { id: `${Date.now()}-a`, role: 'assistant', content: data.answer || '' },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    askQuestion(input.trim());
  };

  // --- Voice notes -------------------------------------------------------

  const transcribeWithNatlas = async (blob: Blob) => {
    setIsTranscribing(true);
    setVoiceNotice('');
    setError('');

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Please sign in again to use the tutor.');
      }

      const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
      const form = new FormData();
      form.append('file', blob, `voice-note.${extension}`);
      form.append('language', languageRef.current);

      const response = await fetch('/api/natlas-transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      });

      const data = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };

      if (response.status === 503) {
        // N-ATLAS speech is not configured yet: fall back to the browser's
        // own recognition so voice notes still work while we wait for the key.
        if (browserSpeechAvailable) {
          setUseBrowserSpeech(true);
          setVoiceNotice(
            'N-ATLAS speech is not configured yet — using your browser\u2019s speech recognition (English works best). Speak now.'
          );
          startBrowserSpeech();
        } else {
          setError(data.error || 'Voice notes need the speech service, which is not configured yet.');
        }
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed. Please try typing your question.');
      }

      // Put the transcript in the input so the learner can review before sending.
      setInput((current) => (current ? `${current} ${data.text}`.trim() : data.text || ''));
      setVoiceNotice('Transcribed — check the text, then press Ask.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    setError('');
    setVoiceNotice('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        if (blob.size > 0) transcribeWithNatlas(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((seconds) => {
          if (seconds + 1 >= MAX_RECORDING_SECONDS) stopRecording();
          return seconds + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone access was blocked. Allow microphone access or type your question.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRecording(false);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const startBrowserSpeech = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = BROWSER_SPEECH_TAGS[languageRef.current] || 'en-NG';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) setInput((current) => `${current} ${transcript}`.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access was blocked. Allow microphone access or type your question.');
        setUseBrowserSpeech(false);
      }
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      setVoiceNotice('Captured — check the text, then press Ask.');
    };

    browserSpeechRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setRecordSeconds(0);
  };

  const stopBrowserSpeech = () => {
    browserSpeechRef.current?.stop();
  };

  const toggleVoice = () => {
    if (isTranscribing || loading) return;
    if (isRecording) {
      if (useBrowserSpeech) stopBrowserSpeech();
      else stopRecording();
      return;
    }
    if (useBrowserSpeech) startBrowserSpeech();
    else startRecording();
  };

  const voiceDisabled = isTranscribing || loading;

  // -----------------------------------------------------------------------

  if (isSignedIn === false) {
    return (
      <section
        aria-labelledby="climate-tutor-title"
        className="rounded-xl border bg-white border-gray-100 dark:bg-gray-800/50 dark:border-gray-700 p-8 text-center"
      >
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Leaf className="h-7 w-7 text-green-700 dark:text-green-400" />
        </div>
        <h2
          id="climate-tutor-title"
          className="text-base font-semibold text-gray-900 dark:text-white mb-1"
        >
          Shara AI Climate Tutor
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Sign in to ask questions about climate change, waste, recycling and renewable energy.
        </p>
        <a
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-green-700 hover:bg-green-800 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </a>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="climate-tutor-title"
      className="rounded-xl border bg-white border-gray-100 dark:bg-gray-800/50 dark:border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-700 to-emerald-600">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/15">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 id="climate-tutor-title" className="text-base font-semibold text-white">
              Shara AI Climate Tutor
            </h2>
            <p className="text-xs text-white/85">
              Powered by Nigeria&apos;s N-ATLAS model
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-white/80" aria-hidden="true" />
          <label htmlFor="climate-tutor-language" className="text-xs text-white/85">
            Response language
          </label>
          <select
            id="climate-tutor-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={loading || isRecording}
            className="rounded-lg border border-white/25 bg-white/10 text-white text-sm px-2 py-1.5 outline-none focus:ring-2 focus:ring-white/40 [&>option]:text-gray-900"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div
        aria-live="polite"
        aria-busy={loading}
        className="p-4 space-y-3 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900/60"
      >
        {messages.length === 0 && !loading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Ask about climate change, recycling, renewable energy and sustainability.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => askQuestion(question)}
                  className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-green-700 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {message.role === 'user' ? (
                  <User className="h-3 w-3 opacity-70" aria-hidden="true" />
                ) : (
                  <Bot className="h-3 w-3 text-green-600 dark:text-green-400" aria-hidden="true" />
                )}
                <span className="text-xs opacity-70">
                  {message.role === 'user' ? 'You' : 'Shara AI Tutor'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </article>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" aria-hidden="true" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Shara AI Tutor is thinking…
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3"
        >
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You can keep using your course materials while the tutor is unavailable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Voice notice */}
      {voiceNotice && !error && (
        <div
          role="status"
          className="mx-4 mt-3 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300"
        >
          {voiceNotice}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4">
        <label htmlFor="climate-tutor-question" className="sr-only">
          Your question
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={toggleVoice}
            disabled={voiceDisabled}
            aria-label={isRecording ? 'Stop recording' : 'Record a voice note'}
            aria-pressed={isRecording}
            title={isRecording ? 'Stop recording' : 'Record a voice note'}
            className={`inline-flex items-center justify-center gap-2 rounded-lg h-[76px] w-14 shrink-0 transition-colors ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
            } ${voiceDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : isRecording ? (
              <Square className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Mic className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <textarea
            id="climate-tutor-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            maxLength={4000}
            rows={3}
            required
            placeholder="What is climate change?"
            className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-green-600/40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed h-[76px] px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Ask
          </button>
        </div>
        {isRecording ? (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
            {useBrowserSpeech
              ? 'Listening… speak your question'
              : `Recording… ${recordSeconds}s / ${MAX_RECORDING_SECONDS}s`}
          </p>
        ) : isTranscribing ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Transcribing your voice note…</p>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Type or record a voice note. Responses are AI-generated and may contain mistakes —
            please verify important information with your course materials.
          </p>
        )}
      </form>
    </section>
  );
}
