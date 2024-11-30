'use client'

import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea";
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
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-h-screen">
      <div className="space-y-4">
        {/* Upload Notes Section */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Upload Notes</h2>
          <FileUpload onFileUpload={setUploadedText} />
          
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Summarization Type:</label>
              <Select value={summarizationType} onValueChange={(value) => setSummarizationType(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="key-points">Key Points</SelectItem>
                  <SelectItem value="tl;dr">TL;DR</SelectItem>
                  <SelectItem value="teaser">Teaser</SelectItem>
                  <SelectItem value="headline">Headline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Length:</label>
              <Select value={summarizationLength} onValueChange={(value) => setSummarizationLength(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStreamingSummarize}
              disabled={isLoading || !uploadedText}
              className="w-full"
            >
              {isLoading ? 'Summarizing...' : 'Summarize Text'}
            </Button>
          </div>
        </Card>

        {/* AI Writing Assistant Section */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">AI Writing Assistant</h2>
          <div className="space-y-3">
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your prompt..."
              className="min-h-[100px]"
            />

            <div>
              <label className="block text-sm font-medium mb-1">Tone:</label>
              <Select value={writerTone} onValueChange={(value) => setWriterTone(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Length:</label>
              <Select value={writerLength} onValueChange={(value) => setWriterLength(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStreamingWrite}
              disabled={isWriting || !topic.trim()}
              className="w-full"
            >
              {isWriting ? 'Writing...' : 'Generate Content'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Right Panel - Output Display */}
      <Card className="p-4 flex flex-col h-full">
        <div className="mb-4">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => checkTranslationAndTranslate()}
            disabled={isTranslating || selectedLanguage === 'en' || !summary}
            className="w-full mt-2"
          >
            {isTranslating ? 'Translating...' : 'Translate Text'}
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {summary && (
            <div className="prose max-w-none">
              <Markdown>{summary}</Markdown>
            </div>
          )}
          
          {writtenContent && (
            <div className="prose max-w-none mt-4">
              <Markdown>{writtenContent}</Markdown>
            </div>
          )}
          
          {translatedSummary && (
            <div className="prose max-w-none mt-4">
              <Markdown>{translatedSummary}</Markdown>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}


export default Page;