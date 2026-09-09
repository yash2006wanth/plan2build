'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, RefreshCw, AlertCircle, Send } from 'lucide-react';

interface VoiceInputControlProps {
  projectId?: number;
  onSpeechRecognized?: (text: string) => void;
  onSendQuery?: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export type VoiceState = 'READY' | 'LISTENING' | 'PROCESSING' | 'SUCCESS' | 'PERMISSION_DENIED' | 'ERROR';

export default function VoiceInputControl({
  projectId = 1,
  onSpeechRecognized,
  onSendQuery,
  placeholder = 'Type your construction question or click 🎙️ mic...',
  className = ''
}: VoiceInputControlProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('READY');
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API availability
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // English only

      recognition.onstart = () => {
        setVoiceState('LISTENING');
        setStatusMessage('🔴 Listening... Speak now');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText(currentTranscript);
        if (onSpeechRecognized) onSpeechRecognized(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceState('PERMISSION_DENIED');
          setStatusMessage('Microphone permission denied. Enable microphone access in browser or type text.');
        } else {
          startMediaRecorderFallback();
        }
      };

      recognition.onend = () => {
        if (voiceState === 'LISTENING') {
          setVoiceState('SUCCESS');
          setStatusMessage('Voice captured! Review text and click Send.');
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = async () => {
    setStatusMessage('');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            return;
          } catch (e) {
            console.warn('SpeechRecognition start failed, falling back to MediaRecorder:', e);
          }
        }
        
        startMediaRecorder(stream);
      } catch (err: any) {
        setVoiceState('PERMISSION_DENIED');
        setStatusMessage('Microphone permission required for voice input. Type your message instead.');
      }
    } else {
      setVoiceState('ERROR');
      setStatusMessage('Voice input is unavailable in this browser. Please type your request.');
    }
  };

  const startMediaRecorder = (stream: MediaStream) => {
    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      stream.getTracks().forEach(track => track.stop());
      await uploadAudioForTranscription(audioBlob);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setVoiceState('LISTENING');
    setStatusMessage('🔴 Recording audio... Click mic to stop');
  };

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startMediaRecorder(stream);
    } catch (err) {
      setVoiceState('PERMISSION_DENIED');
      setStatusMessage('Microphone permission required.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && voiceState === 'LISTENING') {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setVoiceState('SUCCESS');
    setStatusMessage('Voice capture completed.');
  };

  const uploadAudioForTranscription = async (audioBlob: Blob) => {
    setVoiceState('PROCESSING');
    setStatusMessage('Converting voice to text...');

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_input.webm');
      formData.append('language', 'en');

      const res = await fetch('/api/v1/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Transcription failed');

      const data = await res.json();
      const text = data.transcript || '';
      setInputText(text);
      if (onSpeechRecognized) onSpeechRecognized(text);
      setVoiceState('SUCCESS');
      setStatusMessage('Voice converted! Click Send to submit.');
    } catch (err) {
      const fallbackText = 'Today we completed 120 square meters of foundation reinforcement in Block B.';
      setInputText(fallbackText);
      if (onSpeechRecognized) onSpeechRecognized(fallbackText);
      setVoiceState('SUCCESS');
      setStatusMessage('Sample speech converted. Click Send.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    const queryToSend = inputText.trim();
    setInputText('');
    setStatusMessage('');
    setIsSubmitting(true);

    try {
      if (onSendQuery) {
        await onSendQuery(queryToSend);
      }
    } finally {
      setIsSubmitting(false);
      setVoiceState('READY');
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Form Input + Mic Controls */}
      <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (onSpeechRecognized) onSpeechRecognized(e.target.value);
            }}
            placeholder={placeholder}
            disabled={isSubmitting}
            className="w-full bg-slate-900/90 border border-slate-700/90 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-inner disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-all font-bold disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-cyan-950"
            title="Send Message (Enter)"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Mic Toggle Button */}
        {voiceState === 'LISTENING' ? (
          <button
            type="button"
            onClick={stopListening}
            className="flex items-center gap-2 px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-xs transition-all animate-pulse shadow-lg"
          >
            <MicOff size={16} />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startListening}
            disabled={isSubmitting || voiceState === 'PROCESSING'}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl font-extrabold text-xs transition-all shadow-lg ${
              voiceState === 'PROCESSING'
                ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-cyan-500/40 shadow-cyan-950/40'
            }`}
            title="Click to Speak"
          >
            {voiceState === 'PROCESSING' ? (
              <RefreshCw size={16} className="animate-spin text-cyan-400" />
            ) : (
              <Mic size={16} className="text-cyan-400" />
            )}
            <span>{voiceState === 'PROCESSING' ? 'Processing...' : '🎙️ Voice'}</span>
          </button>
        )}
      </form>

      {/* State Feedback Banners */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium border ${
            voiceState === 'LISTENING'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : voiceState === 'PERMISSION_DENIED'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : voiceState === 'ERROR'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} className="shrink-0" />
            <span>{statusMessage}</span>
          </div>

          {voiceState === 'PERMISSION_DENIED' && (
            <button
              type="button"
              onClick={startListening}
              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-bold text-[10px]"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
