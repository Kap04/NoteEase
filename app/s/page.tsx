'use client'

import FileUpload from "@/components/FileUpload";
import React, { useEffect, useState } from "react";
import Markdown from "react-markdown";

interface Summarizer {
  capabilities: (options: { apiKey: string }) => Promise<{ available: string }>;
  create: (options: any) => Promise<any>;
  summarizeStreaming: (
    text: string,
    options: { context: string }
  ) => Promise<AsyncIterableIterator<string>>;
}

interface AI {
  summarizer: Summarizer;
  translation?: {
    createTranslator: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<any>;
    canTranslate: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  };
}

declare global {
  interface Window {
    ai: AI;
  }
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'bn', name: 'Bengali' }
];

function Page() {
  const [summarizer, setSummarizer] = useState<any>(null);
  const [uploadedText, setUploadedText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [translatedSummary, setTranslatedSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [translator, setTranslator] = useState<any>(null);
  const [isTranslationSupported, setIsTranslationSupported] = useState<boolean | null>(null);
  const [isCheckingTranslation, setIsCheckingTranslation] = useState<boolean>(false);

  const [summarizationType, setSummarizationType] = useState<'key-points' | 'tl;dr' | 'teaser' | 'headline'>('key-points');
  const [summarizationLength, setSummarizationLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [sharedContext, setSharedContext] = useState<string>('');



  // Initialize summarizer
  useEffect(() => {
    async function initializeSummarizer() {
      const apiKey = "ApwWWZ4FuIAquQu5SWgRRB9dExHt76gc7yVN4Wo8hPdztL3M1284HOwIydPLt+gpZBrHJ0g/hkY4JC0WMIFOmwUAAAByeyJvcmlnaW4iOiJodHRwczovL25vdGVlYXNlLnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6IkFJU3VtbWFyaXphdGlvbkFQSSIsImV4cGlyeSI6MTc1MzE0MjQwMCwiaXNTdWJkb21haW4iOnRydWV9";

      if (!window.ai?.summarizer) {
        console.error("Summarizer API is not supported");
        return;
      }

      const capabilities = await window.ai.summarizer.capabilities({ apiKey });
      
      if (capabilities.available === "no") {
        console.error("Summarizer API not available");
        return;
      }

      const options = {
        sharedContext: "This is a general-purpose text summarization context.",
        type: summarizationType,
        format: "plain-text",
        length: summarizationLength,
        apiKey,
      };

      const newSummarizer = await window.ai.summarizer.create(options);
      setSummarizer(newSummarizer);
    }

    initializeSummarizer();
  }, []);



  async function checkTranslationAndTranslate() {
    if (selectedLanguage === 'en' || !summary) return;
    
    setIsCheckingTranslation(true);
    try {
      // Check if Translation API is supported
      const isSupported = 'translation' in window && 'createTranslator' in (window as any).translation;
      setIsTranslationSupported(isSupported);

      if (!isSupported) {
        console.log('Translation API not supported');
        return;
      }

      // Check if translation is possible for the selected language
      const canTranslateResult = await (window as any).translation.canTranslate({
        sourceLanguage: 'en',
        targetLanguage: selectedLanguage
      });

      if (canTranslateResult === 'readily' || canTranslateResult === 'after-download') {
        const newTranslator = await (window as any).translation.createTranslator({
          sourceLanguage: 'en',
          targetLanguage: selectedLanguage
        });

        setTranslator(newTranslator);
        await handleTranslation(summary, newTranslator);
      } else {
        console.log('Translation not available for this language pair');
        setIsTranslationSupported(false);  // Fixed variable name
      }
    } catch (error) {
      console.error('Translation check error:', error);
      setIsTranslationSupported(false);
    } finally {
      setIsCheckingTranslation(false);
    }
  }

  async function handleStreamingSummarize() {
    if (!summarizer || !uploadedText.trim()) return;
  
    try {
      setIsLoading(true);
      setSummary('');
      setTranslatedSummary('');
  
      const stream = await summarizer.summarizeStreaming(uploadedText, {
        context: sharedContext || "Provide a clear and concise summary.",
        type: summarizationType,
        length: summarizationLength
      });
  
      let summaryText = '';
      for await (const chunk of stream) {
        summaryText = chunk;
        setSummary(summaryText);
      }
    } catch (error) {
      console.error("Summarization error:", error);
      setSummary('Error generating summary');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTranslation(textToTranslate: string, currentTranslator: any) {
    if (!currentTranslator || !textToTranslate || selectedLanguage === 'en') return;

    try {
      setIsTranslating(true);
      const translatedText = await currentTranslator.translate(textToTranslate);
      setTranslatedSummary(translatedText);
    } catch (error) {
      console.error("Translation error:", error);
      setTranslatedSummary('Error translating summary');
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Left sidebar - 1/3 width */}
      <div className="w-1/3 p-4 border-r overflow-y-auto bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Document Summarizer</h1>
        
        <div className="space-y-4">
          <FileUpload onFileUpload={setUploadedText} />
          
          <div>
            <label className="block mb-2 text-sm font-medium">Summary Type</label>
            <select 
              value={summarizationType}
              onChange={(e) => setSummarizationType(e.target.value as any)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="key-points">Key Points</option>
              <option value="tl;dr">TL;DR</option>
              <option value="teaser">Teaser</option>
              <option value="headline">Headline</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Length</label>
            <select 
              value={summarizationLength}
              onChange={(e) => setSummarizationLength(e.target.value as any)}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Context (Optional)</label>
            <textarea 
              value={sharedContext}
              onChange={(e) => setSharedContext(e.target.value)}
              placeholder="Add context to guide summarization..."
              className="w-full p-2 border rounded text-sm h-20"
            />
          </div>

          <button 
            onClick={handleStreamingSummarize}
            disabled={!uploadedText.trim() || isLoading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 text-sm"
          >
            {isLoading ? 'Summarizing...' : 'Generate Summary'}
          </button>
        </div>
      </div>

      {/* Main content - 2/3 width */}
      <div className="w-2/3 p-6 overflow-y-auto">
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Translation:</label>
            <select 
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setTranslatedSummary('');
                setIsTranslationSupported(null);
              }}
              className="p-2 border rounded text-sm w-48"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <button
              onClick={checkTranslationAndTranslate}
              disabled={!summary || selectedLanguage === 'en' || isCheckingTranslation || isTranslating}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 text-sm"
            >
              {isCheckingTranslation ? 'Checking...' : isTranslating ? 'Translating...' : 'Translate'}
            </button>
            {isTranslationSupported === false && (
              <span className="text-sm text-red-500">Translation not supported</span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {summary && (
            <div className="p-6 border rounded-lg bg-white shadow-sm">
              <h2 className="text-lg font-semibold mb-4">
                {selectedLanguage === 'en' ? 'Summary' : 
                  `Summary (${SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)?.name})`}
              </h2>
              
              {selectedLanguage === 'en' ? (
                <Markdown className="prose">{summary}</Markdown>
              ) : (
                <Markdown className="prose">
                  {translatedSummary || summary}
                </Markdown>
              )}
            </div>
          )}

          {!summary && !isLoading && (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Upload a document and click Generate Summary to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Page;