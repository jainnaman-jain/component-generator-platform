'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { LiveProvider, LivePreview, LiveError } from 'react-live';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import JSZip from 'jszip';

// --- Interfaces ---
interface CodeState {
  jsx: string;
  css: string;
}

interface Session {
  _id: string;
  title: string;
  chatHistory: Message[];
  createdAt: string;
  codeHistory: CodeState[]; 
}

interface Message {
  _id: string; 
  role: 'user' | 'assistant';
  content: string;
}

// --- Helper Functions ---
const parseAIResponse = (response: string) => {
  const codeBlockRegex = /```(jsx|javascript|tsx|css)\s*([\s\S]*?)\s*```/g;
  let jsx = '';
  let css = '';
  const matches = response.matchAll(codeBlockRegex);
  for (const match of matches) {
    const language = match[1].toLowerCase();
    const code = match[2].trim();
    if (['jsx', 'javascript', 'tsx'].includes(language)) jsx = code;
    else if (language === 'css') css = code;
  }
  return { jsx, css };
};

// --- Main Component ---
export default function DashboardPage() {
  // --- State Management ---
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [codeHistory, setCodeHistory] = useState<CodeState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [activeCodeTab, setActiveCodeTab] = useState<'jsx' | 'css'>('jsx');
  const [copySuccess, setCopySuccess] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentCode = codeHistory[historyIndex] || { jsx: '', css: '' };

  // --- Effects ---
  useEffect(() => {
    const fetchSessions = async () => {
      const token = Cookies.get('authToken');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sessions`;
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data: Session[] = await response.json();
        const validSessions = data.filter(session => session && session._id);
        setSessions(validSessions);
        if (validSessions.length > 0) {
          handleSelectSession(validSessions[0]);
        }
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers ---
  const handleSelectSession = (session: Session) => {
    setActiveSessionId(session._id);
    const validMessages = (session.chatHistory || []).filter(msg => msg && msg._id);
    setMessages(validMessages);
    
    const loadedHistory = session.codeHistory && session.codeHistory.length > 0 
      ? session.codeHistory 
      : [{ jsx: '', css: '' }];
      
    setCodeHistory(loadedHistory);
    setHistoryIndex(loadedHistory.length - 1);
  };
  
  const handleNewSession = async () => {
    const token = Cookies.get('authToken');
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sessions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Session' }),
    });
    if (response.ok) {
        const newSession: Session = await response.json();
        setSessions([newSession, ...sessions]);
        handleSelectSession(newSession);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !activeSessionId || isLoading) return;

    setIsLoading(true);
    const userMessageContent = prompt;
    setMessages((prev) => [...prev, { _id: Date.now().toString(), role: 'user', content: userMessageContent }]);
    setPrompt('');
    
    try {
      const token = Cookies.get('authToken');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/ai/generate`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMessageContent, 
          sessionId: activeSessionId,
          currentJsx: currentCode.jsx,
          currentCss: currentCode.css,
        }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const aiResponseData = await response.json();
      const rawResponseString = aiResponseData.response;

      const { jsx, css } = parseAIResponse(rawResponseString);
      
      const newHistory = codeHistory.slice(0, historyIndex + 1);
      const updatedHistory = [...newHistory, { jsx, css }];
      
      setCodeHistory(updatedHistory);
      setHistoryIndex(updatedHistory.length - 1);
      
      if (activeSessionId) {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sessions/${activeSessionId}`;
        await fetch(apiUrl, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeHistory: updatedHistory })
        });
      }

      const assistantMessage: Message = { _id: Date.now().toString() + '_assistant', role: 'assistant', content: rawResponseString };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      const errorMessage: Message = { _id: Date.now().toString(), role: 'assistant', content: 'Sorry, I ran into an error.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < codeHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      const currentTab = activeCodeTab;
      setCopySuccess(currentTab);
      setTimeout(() => {
        if (copySuccess === currentTab) setCopySuccess('');
      }, 2000);
    });
  };

  const handleDownloadZip = async () => {
    if (!currentCode.jsx) return;
    const zip = new JSZip();
    zip.file('Component.tsx', currentCode.jsx);
    if (currentCode.css) zip.file('styles.css', currentCode.css);
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'component.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Render ---
  return (
    <div className="flex h-[calc(100vh-68px)] bg-gray-900 text-white">
      {/* Sessions Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-gray-800 p-4">
        <h2 className="text-xl font-semibold">Sessions</h2>
        <button 
          onClick={handleNewSession} 
          className="mt-4 flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
          New Session
        </button>
        <div className="mt-4 h-px bg-gray-700"></div>
        <ul className="mt-4 flex-grow space-y-2 overflow-y-auto">
          {sessions.map((session) => (
            <li key={session._id}>
              <button
                onClick={() => handleSelectSession(session)}
                className={`w-full rounded-md p-3 text-left text-sm transition ${activeSessionId === session._id ? 'bg-indigo-700 font-semibold' : 'hover:bg-gray-700'}`}
              >
                {session.title || `Session ${session._id?.substring(0, 8) || '...'}`}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Top Half: Preview and Chat */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat Panel */}
          <div className="flex w-1/2 flex-col border-l border-r border-gray-700 bg-gray-800">
            <div className="flex-grow overflow-y-auto p-6">
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div key={msg._id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 font-bold">A</div>}
                    <div className={`max-w-lg rounded-xl p-4 text-sm ${msg.role === 'user' ? 'rounded-br-none bg-blue-600' : 'rounded-bl-none bg-gray-700'}`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
            <div className="border-t border-gray-700 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  placeholder={isLoading ? "Generating..." : (activeSessionId ? "Describe a component..." : "Select a session.")}
                  className="w-full rounded-lg border-gray-600 bg-gray-700 p-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={!activeSessionId || isLoading}
                />
                <button type="submit" disabled={!activeSessionId || isLoading} className="rounded-lg bg-indigo-600 p-3 text-white transition hover:bg-indigo-500 disabled:bg-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </button>
              </form>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex w-1/2 flex-col bg-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-800">Live Preview</h3>
            <div className="mt-4 flex-grow rounded-lg bg-white shadow-inner">
              <LiveProvider code={currentCode.jsx}>
                <style>{currentCode.css}</style>
                <div className="flex h-full w-full items-center justify-center p-4">
                  <LivePreview />
                </div>
                <LiveError className="m-4 rounded bg-red-100 p-2 text-sm text-red-700" />
              </LiveProvider>
            </div>
          </div>
        </div>

        {/* Bottom Half: Code Viewer */}
        <div className="flex h-2/5 flex-col border-t border-gray-700 bg-[#1E1E1E] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => setActiveCodeTab('jsx')} className={`rounded-t-md px-4 py-2 text-sm ${activeCodeTab === 'jsx' ? 'bg-[#282C34] text-white' : 'bg-gray-800 text-gray-400'}`}>JSX</button>
              <button onClick={() => setActiveCodeTab('css')} className={`rounded-t-md px-4 py-2 text-sm ${activeCodeTab === 'css' ? 'bg-[#282C34] text-white' : 'bg-gray-800 text-gray-400'}`}>CSS</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleUndo} disabled={historyIndex <= 0} className="flex items-center gap-2 rounded-md bg-gray-600 px-3 py-1 text-sm text-white transition hover:bg-gray-500 disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Undo
              </button>
              <button onClick={handleRedo} disabled={historyIndex >= codeHistory.length - 1} className="flex items-center gap-2 rounded-md bg-gray-600 px-3 py-1 text-sm text-white transition hover:bg-gray-500 disabled:opacity-50">
                Redo
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <button onClick={handleDownloadZip} disabled={!currentCode.jsx} className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-1 text-sm text-white transition hover:bg-green-500 disabled:bg-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </button>
            </div>
          </div>
          <div className="relative h-full flex-grow overflow-auto bg-[#282C34]">
            <button onClick={() => handleCopyCode(activeCodeTab === 'jsx' ? currentCode.jsx : currentCode.css)} className="absolute top-2 right-2 z-10 rounded bg-gray-600 px-2 py-1 text-xs text-white opacity-50 transition hover:opacity-100">
              {copySuccess === activeCodeTab ? 'Copied!' : 'Copy'}
            </button>
            <SyntaxHighlighter language={activeCodeTab} style={vscDarkPlus} showLineNumbers customStyle={{ margin: 0, height: '100%' }}>
              {activeCodeTab === 'jsx' ? currentCode.jsx : currentCode.css}
            </SyntaxHighlighter>
          </div>
        </div>
      </main>
    </div>
  );
}
