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

interface Writer {
  create: (options: any) => Promise<any>;
  write: (text: string, options?: any) => Promise<string>;
  writeStreaming: (text: string, options?: any) => Promise<AsyncIterableIterator<string>>;
}

interface AI {
  summarizer: Summarizer;
  writer: Writer;
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
  const [writer, setWriter] = useState<any>(null);
  const [uploadedText, setUploadedText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [translatedSummary, setTranslatedSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [translator, setTranslator] = useState<any>(null);
  const [isTranslationSupported, setIsTranslationSupported] = useState<boolean | null>(null);
  const [isCheckingTranslation, setIsCheckingTranslation] = useState<boolean>(false);

  const [summarizationType, setSummarizationType] = useState<'key-points' | 'tl;dr' | 'teaser' | 'headline'>('key-points');
  const [summarizationLength, setSummarizationLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [sharedContext, setSharedContext] = useState<string>('');

  const [topic, setTopic] = useState<string>('');
  const [writtenContent, setWrittenContent] = useState<string>('');
  const [writerTone, setWriterTone] = useState<'formal' | 'neutral' | 'casual'>('neutral');
  const [writerLength, setWriterLength] = useState<'short' | 'medium' | 'long'>('medium');


  // Initialize writer and summarizer
  useEffect(() => {
    async function initialize() {
      const apiKey = "ApwWWZ4FuIAquQu5SWgRRB9dExHt76gc7yVN4Wo8hPdztL3M1284HOwIydPLt+gpZBrHJ0g/hkY4JC0WMIFOmwUAAAByeyJvcmlnaW4iOiJodHRwczovL25vdGVlYXNlLnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6IkFJU3VtbWFyaXphdGlvbkFQSSIsImV4cGlyeSI6MTc1MzE0MjQwMCwiaXNTdWJkb21haW4iOnRydWV9";

      try {
        // Initialize summarizer
        if (window.ai?.summarizer) {
          const capabilities = await window.ai.summarizer.capabilities({ apiKey });
          if (capabilities.available !== "no") {
            const newSummarizer = await window.ai.summarizer.create({
              sharedContext: "This is a general-purpose text summarization context.",
              type: "key-points",
              format: "markdown",
              length: "medium",
              apiKey,
            });
            setSummarizer(newSummarizer);
          }
        }

        // Initialize writer
        if (window.ai?.writer) {
          try {
            const newWriter = await window.ai.writer.create({
              sharedContext: "This is a note-taking context.",
              tone: "neutral",
              format: "markdown",
              length: "medium",
              apiKey,
            });
            setWriter(newWriter);
          } catch (error) {
            console.error("Error initializing writer:", error);
          }
        } else {
          console.log("Writer API not available");
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    }

    initialize();
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

  // New function for handling writing
  async function handleStreamingWrite() {
    if (!writer || !topic.trim()) return;
  
    try {
      setIsWriting(true);
      setWrittenContent('');
  
      // First try streaming approach
      try {
        const stream = await writer.writeStreaming(topic, {
          context: `Create detailed notes about the following topic:\n\n${topic}`,
          tone: writerTone,
          length: writerLength,
          format: "markdown"
        });
  
        let content = '';
        if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
          for await (const chunk of stream) {
            if (typeof chunk === 'string') {
              content += chunk;
              setWrittenContent(content);
            }
          }
        } else {
          // If stream is not properly iterable, throw error to trigger fallback
          throw new Error('Stream not properly initialized');
        }
      } catch (streamError) {
        console.warn("Streaming failed, falling back to regular write:", streamError);
        // Fallback to regular write
        const content = await writer.write(topic, {
          context: `Create detailed notes about the following topic:\n\n${topic}`,
          tone: writerTone,
          length: writerLength,
          format: "markdown"
        });
        setWrittenContent(content);
      }
    } catch (error) {
      console.error("Writing error:", error);
      setWrittenContent('Error generating content. Please try again.');
    } finally {
      setIsWriting(false);
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

  // Fallback for when streaming isn't available
  async function handleWrite() {
    if (!writer || !topic.trim()) return;

    try {
      setIsWriting(true);
      setWrittenContent('');

      const content = await writer.write(topic, {
        context: `Create detailed notes about the following topic:\n\n${topic}`,
        tone: writerTone,
        length: writerLength,
        format: "markdown"
      });

      setWrittenContent(content);
    } catch (error) {
      console.error("Writing error:", error);
      setWrittenContent('Error generating content. Please try again.');
    } finally {
      setIsWriting(false);
    }
  }

  // return (
  //   <div className="flex h-screen">
  //     {/* Left sidebar - 1/3 width */}
  //     <div className="w-1/3 p-4 border-r overflow-y-auto bg-gray-50">
  //       <h1 className="text-2xl font-bold mb-4">Note Taking Assistant</h1>
        
  //       {/* Writer section */}
  //       <div className="mb-6 space-y-4">
  //         <div>
  //           <label className="block mb-2 text-sm font-medium">Write Notes About:</label>
  //           <textarea 
  //             value={topic}
  //             onChange={(e) => setTopic(e.target.value)}
  //             placeholder="Enter a topic or concept..."
  //             className="w-full p-2 border rounded text-sm h-20 resize-none"
  //           />
  //         </div>

  //         <div className="space-y-2">
  //           <div className="flex space-x-2">
  //             <select 
  //               value={writerTone}
  //               onChange={(e) => setWriterTone(e.target.value as any)}
  //               className="p-2 border rounded text-sm flex-1"
  //             >
  //               <option value="formal">Formal</option>
  //               <option value="neutral">Neutral</option>
  //               <option value="casual">Casual</option>
  //             </select>

  //             <select 
  //               value={writerLength}
  //               onChange={(e) => setWriterLength(e.target.value as any)}
  //               className="p-2 border rounded text-sm flex-1"
  //             >
  //               <option value="short">Short</option>
  //               <option value="medium">Medium</option>
  //               <option value="long">Long</option>
  //             </select>
  //           </div>

  //           <button 
  //             onClick={handleStreamingWrite}
  //             disabled={!topic.trim() || isWriting || !writer}
  //             className="w-full bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300 text-sm"
  //           >
  //             {isWriting ? 'Writing...' : writer ? 'Write Notes' : 'Writer API not available'}
  //           </button>
  //         </div>
  //       </div>

  //       <div className="border-t pt-6">
  //         <h2 className="text-lg font-semibold mb-4">Or Summarize Document</h2>
  //         {/* ... (keep existing FileUpload and summarization controls) */}
  //         <div className="space-y-4">
  //         <FileUpload onFileUpload={setUploadedText} />
          
  //         <div>
  //           <label className="block mb-2 text-sm font-medium">Summary Type</label>
  //           <select 
  //             value={summarizationType}
  //             onChange={(e) => setSummarizationType(e.target.value as any)}
  //             className="w-full p-2 border rounded text-sm"
  //           >
  //             <option value="key-points">Key Points</option>
  //             <option value="tl;dr">TL;DR</option>
  //             <option value="teaser">Teaser</option>
  //             <option value="headline">Headline</option>
  //           </select>
  //         </div>

  //         <div>
  //           <label className="block mb-2 text-sm font-medium">Length</label>
  //           <select 
  //             value={summarizationLength}
  //             onChange={(e) => setSummarizationLength(e.target.value as any)}
  //             className="w-full p-2 border rounded text-sm"
  //           >
  //             <option value="short">Short</option>
  //             <option value="medium">Medium</option>
  //             <option value="long">Long</option>
  //           </select>
  //         </div>

  //         <div>
  //           <label className="block mb-2 text-sm font-medium">Context (Optional)</label>
  //           <textarea 
  //             value={sharedContext}
  //             onChange={(e) => setSharedContext(e.target.value)}
  //             placeholder="Add context to guide summarization..."
  //             className="w-full p-2 border rounded text-sm h-20"
  //           />
  //         </div>

  //         <button 
  //           onClick={handleStreamingSummarize}
  //           disabled={!uploadedText.trim() || isLoading}
  //           className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 text-sm"
  //         >
  //           {isLoading ? 'Summarizing...' : 'Generate Summary'}
  //         </button>
  //       </div>

  //       </div>
  //     </div>

  //     {/* Main content - 2/3 width */}
  //     <div className="w-2/3 p-6 overflow-y-auto">
  //       <div className="mb-4 flex items-center justify-end">
  //         <div className="flex items-center space-x-2">
  //           <label className="text-sm font-medium">Translation:</label>
  //           <select 
  //             value={selectedLanguage}
  //             onChange={(e) => {
  //               setSelectedLanguage(e.target.value);
  //               setTranslatedSummary('');
  //               setIsTranslationSupported(null);
  //             }}
  //             className="p-2 border rounded text-sm w-48"
  //           >
  //             {SUPPORTED_LANGUAGES.map(lang => (
  //               <option key={lang.code} value={lang.code}>
  //                 {lang.name}
  //               </option>
  //             ))}
  //           </select>
  //           <button
  //             onClick={checkTranslationAndTranslate}
  //             disabled={!summary || selectedLanguage === 'en' || isCheckingTranslation || isTranslating}
  //             className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300 text-sm"
  //           >
  //             {isCheckingTranslation ? 'Checking...' : isTranslating ? 'Translating...' : 'Translate'}
  //           </button>
  //           {isTranslationSupported === false && (
  //             <span className="text-sm text-red-500">Translation not supported</span>
  //           )}
  //         </div>
  //       </div>

  //       <div className="space-y-6">
  //         {summary && (
  //           <div className="p-6 border rounded-lg bg-white shadow-sm">
  //             <h2 className="text-lg font-semibold mb-4">
  //               {selectedLanguage === 'en' ? 'Summary' : 
  //                 `Summary (${SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)?.name})`}
  //             </h2>
              
  //             {selectedLanguage === 'en' ? (
  //               <Markdown className="prose">{summary}</Markdown>
  //             ) : (
  //               <Markdown className="prose">
  //                 {translatedSummary || summary}
  //               </Markdown>
  //             )}
  //           </div>
  //         )}

  //         {!summary && !isLoading && (
  //           <div className="flex items-center justify-center h-64 text-gray-500">
  //             Upload a document and click Generate Summary to begin
  //           </div>
  //         )}
  //       </div>
  //     </div>
  //   </div>
  // );
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Smart Note Taking App</h1>
      
      {/* File Upload Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Text Summarization</h2>
        <FileUpload onFileUpload={setUploadedText} />
        
        {uploadedText && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Uploaded Text:</h3>
            <div className="bg-white p-3 rounded border max-h-40 overflow-y-auto">
              {uploadedText}
            </div>
          </div>
        )}
  
        {/* Summarization Controls */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Summarization Type:</label>
            <select
              value={summarizationType}
              onChange={(e) => setSummarizationType(e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="key-points">Key Points</option>
              <option value="tl;dr">TL;DR</option>
              <option value="teaser">Teaser</option>
              <option value="headline">Headline</option>
            </select>
          </div>
  
          <div>
            <label className="block text-sm font-medium mb-1">Length:</label>
            <select
              value={summarizationLength}
              onChange={(e) => setSummarizationLength(e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
  
          <button
            onClick={handleStreamingSummarize}
            disabled={isLoading || !uploadedText}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {isLoading ? 'Summarizing...' : 'Summarize Text'}
          </button>
        </div>
  
        {/* Summary Display */}
        {summary && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Summary:</h3>
            <div className="bg-white p-3 rounded border">
              <Markdown>{summary}</Markdown>
            </div>
          </div>
        )}
      </div>
  
      {/* Writing Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">AI Writing Assistant</h2>
        
        {/* Writing Controls */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Topic or Prompt:</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 border rounded min-h-[100px]"
              placeholder="Enter your topic or what you'd like to write about..."
            />
          </div>
  
          <div>
            <label className="block text-sm font-medium mb-1">Tone:</label>
            <select
              value={writerTone}
              onChange={(e) => setWriterTone(e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="formal">Formal</option>
              <option value="neutral">Neutral</option>
              <option value="casual">Casual</option>
            </select>
          </div>
  
          <div>
            <label className="block text-sm font-medium mb-1">Length:</label>
            <select
              value={writerLength}
              onChange={(e) => setWriterLength(e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
  
          <button
            onClick={handleStreamingWrite}
            disabled={isWriting || !topic.trim()}
            className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {isWriting ? 'Writing...' : 'Generate Content'}
          </button>
        </div>
  
        {/* Written Content Display */}
        {writtenContent && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Generated Content:</h3>
            <div className="bg-white p-3 rounded border">
              <Markdown>{writtenContent}</Markdown>
            </div>
          </div>
        )}
      </div>
  
      {/* Translation Section */}
      {summary && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Translation</h2>
          <div className="space-y-3">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
  
            <button
              onClick={() => checkTranslationAndTranslate()}
              disabled={isTranslating || selectedLanguage === 'en' || !summary}
              className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600 disabled:bg-gray-300"
            >
              {isTranslating ? 'Translating...' : 'Translate Summary'}
            </button>
  
            {isCheckingTranslation && (
              <div className="text-gray-600">Checking translation availability...</div>
            )}
  
            {isTranslationSupported === false && (
              <div className="text-red-500">
                Translation is not available for this language pair.
              </div>
            )}
  
            {translatedSummary && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Translated Summary:</h3>
                <div className="bg-white p-3 rounded border">
                  <Markdown>{translatedSummary}</Markdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default Page;