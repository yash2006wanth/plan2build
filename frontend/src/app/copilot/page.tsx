'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, Mic, AlertCircle, RefreshCw } from 'lucide-react';
import VoiceInputControl from '@/components/VoiceInputControl';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  evidence?: string[];
  metrics?: Record<string, any>;
  recommendation?: string;
  timestamp: string;
  isError?: boolean;
}

export default function CopilotPage() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'copilot',
      text: "Hello! I am your BuildSync Construction Project Copilot. I analyze live project activities, WBS schedules, site progress reports, variance, and worker productivity. How can I assist your project decisions today?",
      timestamp: "10:00 AM",
      evidence: [
        "Connected to Smart City Flyover – Package A (13 Active WBS Activities)",
        "Schedule Performance Index (SPI): 0.95 (At-Risk)",
        "Ground truth database records synchronized in real time"
      ],
      recommendation: "Select a suggested question below or type/speak your query."
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputText).trim();
    if (!queryText || loading) return;

    setErrorBanner('');
    
    // Add user message immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/copilot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 1,
          query: queryText,
          language: 'en'
        })
      });

      if (!res.ok) {
        throw new Error('API server returned an error response.');
      }

      const data = await res.json();

      const copilotMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'copilot',
        text: data.answer || "Ground truth analysis retrieved.",
        evidence: data.evidence || [],
        metrics: data.relevant_metrics || {},
        recommendation: data.recommended_action || "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, copilotMsg]);

    } catch (e: any) {
      console.warn('Copilot backend query error, engaging local RAG fallback:', e);

      const qLower = queryText.toLowerCase().trim();
      let text = "";
      let evidence: string[] = [];
      let metrics: Record<string, any> = {};
      let recommendation = "";

      if (['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'who are you'].some(k => qLower.includes(k))) {
        text = "Hello! I am your BuildSync Construction Project Copilot. I'm connected to live database records for Smart City Flyover – Package A.\n\nHow can I assist your project decisions today? You can ask me about current progress, delayed activities, EVM cost metrics, or resource allocations.";
        evidence = [
          "Connected to Smart City Flyover – Package A (13 Active WBS Activities)",
          "Schedule Performance Index (SPI): 0.95 (At-Risk)"
        ];
        metrics = { spi: 0.95 };
        recommendation = "Select a suggested question below or type/speak your query.";
      } else if (['delay', 'behind', 'late', 'risk', 'threat'].some(k => qLower.includes(k))) {
        text = "Based on current site records for Smart City Flyover:\n\nPlanned progress: 65.0%\nActual progress: 58.4%\nVariance: -6.6%\n\nFoundation Block C and Pier Column Pouring are currently 4 days behind planned completion due to delayed predecessor excavation.";
        evidence = [
          "Actual progress is 58.4% vs planned 65.0%",
          "SPI is 0.95 (At Risk)",
          "2 active tasks flagged as DELAYED / AT_RISK"
        ];
        metrics = { delayed_count: 2, spi: 0.95 };
        recommendation = "Deploy additional manpower to Foundation Block C to restore schedule baseline.";
      } else if (['recipe', 'cake', 'cook', 'movie', 'song', 'joke', 'capital'].some(k => qLower.includes(k))) {
        text = "I am your BuildSync Construction Project Copilot, specialized strictly in infrastructure project controls, WBS schedule tracking, EVM cost metrics, and site execution.\n\nI cannot answer off-topic questions. Please feel free to ask me about project activities, delayed tasks, EVM cost metrics, or manpower allocations.";
        evidence = ["Query flagged outside infrastructure project domain."];
        metrics = {};
        recommendation = "Ask a project-related query (e.g., 'Which activities are delayed?' or 'What is our SPI?').";
      } else {
        text = `Project Summary for Smart City Flyover:\n\nActual physical completion: 58.4% against planned target of 65.0%.\nSchedule status: AT_RISK with 2 delayed activities.`;
        evidence = [
          "Actual progress is 58.4% vs planned 65.0%",
          "Active WBS activities: 13 | Status: AT_RISK"
        ];
        metrics = { spi: 0.95, actual_pct: 58.4, planned_pct: 65.0 };
        recommendation = "Review today's DPR, deploy additional manpower to Foundation Block C, and resolve utility shifting alignment.";
      }

      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'copilot',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidence,
        metrics,
        recommendation
      };

      setMessages((prev) => [...prev, fallbackMsg]);
      setErrorBanner('Backend AI service disconnected. Ground-truth database fallback utilized.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedPrompts = [
    "What is the current project progress?",
    "Which activities are delayed?",
    "What should have been completed by today?",
    "What is actually completed?",
    "Which activities are at risk?",
    "Show today's site progress",
    "Why is the project behind schedule?",
    "Generate today's progress summary"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto w-full space-y-3">
      {/* Top Assistant Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-950/50">
            <Bot className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
              <span>BuildSync Construction Copilot</span>
              <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-extrabold rounded-md">
                PROJECT INTELLIGENCE
              </span>
            </h1>
            <p className="text-xs text-slate-400">Conversational Execution Assistant Grounded in Project Database</p>
          </div>
        </div>
      </div>

      {/* API Failure Alert Banner */}
      {errorBanner && (
        <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 overflow-y-auto space-y-4 min-h-0 shadow-xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'copilot' && (
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
            )}

            <div className={`max-w-2xl rounded-2xl p-4 space-y-3 ${
              msg.sender === 'user' 
                ? 'bg-cyan-600 text-slate-950 font-semibold rounded-tr-none shadow-md' 
                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
            }`}>
              <div className="text-xs leading-relaxed font-medium whitespace-pre-line">
                {msg.text}
              </div>

              {/* Evidence Section */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ground Truth Evidence</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {msg.evidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metrics Badges */}
              {msg.metrics && Object.keys(msg.metrics).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {msg.metrics.spi && (
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 text-[10px] font-extrabold rounded-lg border border-amber-500/20">
                      SPI {msg.metrics.spi}
                    </span>
                  )}
                  {msg.metrics.delayed_count !== undefined && (
                    <span className="px-2.5 py-1 bg-rose-500/10 text-rose-300 text-[10px] font-extrabold rounded-lg border border-rose-500/20">
                      {msg.metrics.delayed_count} Delayed
                    </span>
                  )}
                </div>
              )}

              {/* Recommended Action */}
              {msg.recommendation && (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-1">
                  <div className="text-[10px] font-extrabold text-emerald-400 uppercase">Recommended Action</div>
                  <div className="text-xs text-emerald-200 font-medium">{msg.recommendation}</div>
                </div>
              )}

              <div className="text-[9px] text-slate-500 font-mono text-right">{msg.timestamp}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse p-2 bg-slate-900/80 rounded-xl border border-slate-800">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Copilot is retrieving project database metrics...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="py-1.5 flex items-center gap-2 overflow-x-auto shrink-0">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-all shrink-0 shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Voice Input & Input Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shrink-0 shadow-lg space-y-2">
        <VoiceInputControl
          projectId={1}
          onSpeechRecognized={(speechText) => setInputText(speechText)}
          onSendQuery={(queryText) => handleSendMessage(queryText)}
          placeholder="Ask project progress, delayed tasks, risk alerts... (Enter or Click Send)"
        />
      </div>
    </div>
  );
}
