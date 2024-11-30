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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useState } from "react";
import Markdown from "react-markdown";

interface SummarizerInstance {
  summarizeStreaming: (
    text: string,
    options: {
      context?: string,
      type?: SummarizationType,
      length?: ContentLength
    }
  ) => AsyncIterableIterator<string>;
}

interface WriterInstance {
  write: (text: string, options?: WriterOptions) => Promise<string>;
  writeStreaming: (text: string, options?: WriterOptions) => Promise<AsyncIterableIterator<string>>;
}

interface Summarizer {
  capabilities: () => Promise<{ available: string }>;
  create: (options: SummarizerOptions) => Promise<SummarizerInstance>;
}

interface Writer {
  create: (options: WriterOptions) => Promise<WriterInstance>;
}

interface TranslatorInstance {
  translate: (text: string) => Promise<string>;
}

interface AI {
  summarizer?: Summarizer;
  writer?: Writer;
}

type SummarizationType = 'key-points' | 'tl;dr' | 'teaser' | 'headline';
type ContentLength = 'short' | 'medium' | 'long';
type WriterTone = 'formal' | 'neutral' | 'casual';

interface WriterOptions {
  context?: string;
  tone?: WriterTone;
  length?: ContentLength;
  format?: string;
}

interface SummarizerOptions {
  context?: string;
  type?: SummarizationType;
  format?: string;
  length?: ContentLength;
  
}

interface TranslationAPI {
  createTranslator: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<TranslatorInstance>;
  canTranslate: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
}

declare global {
  interface Window {
    ai: AI;
    translation: TranslationAPI;
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
  const [summarizer, setSummarizer] = useState<SummarizerInstance | null>(null);
  const [writer, setWriter] = useState<WriterInstance | null>(null);
  const [uploadedText, setUploadedText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [translatedSummary, setTranslatedSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  const [isTranslationSupported, setIsTranslationSupported] = useState<boolean | null>(null);
  const [isCheckingTranslation, setIsCheckingTranslation] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"upload" | "write">("upload")

  const [summarizationType, setSummarizationType] = useState<SummarizationType>('key-points');
  const [summarizationLength, setSummarizationLength] = useState<ContentLength>('medium');
  const sharedContext = "Provide a clear and concise summary.";

  const [topic, setTopic] = useState<string>('');
  const [writtenContent, setWrittenContent] = useState<string>('');
  const [writerTone, setWriterTone] = useState<WriterTone>('neutral');
  const [writerLength, setWriterLength] = useState<ContentLength>('medium');

  useEffect(() => {
    async function initialize() {
      
      try {
        //  Initialize summarizer
        if (window.ai?.summarizer) {
          const capabilities = await window.ai.summarizer.capabilities();
          if (capabilities.available !== "no") {
            const newSummarizer = await window.ai.summarizer.create({
              context: "This is a general-purpose text summarization context.",
              type: "key-points",
              format: "markdown",
              length: "medium",
              
            });
            setSummarizer(newSummarizer);
          }
        }

        //  Initialize writer
        if (window.ai?.writer) {
          try {
            const newWriter = await window.ai.writer.create({
              context: "This is a note-taking context.",
              tone: "neutral",
              format: "markdown",
              length: "medium",
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
    const textToTranslate = summary || writtenContent;
    if (selectedLanguage === 'en' || !textToTranslate) return;

    setIsCheckingTranslation(true);
    try {
      const isSupported = 'translation' in window;
      setIsTranslationSupported(isSupported);

      if (!isSupported) {
        console.log('Translation API not supported');
        return;
      }

      const canTranslateResult = await window.translation.canTranslate({
        sourceLanguage: 'en',
        targetLanguage: selectedLanguage
      });

      if (canTranslateResult === 'readily' || canTranslateResult === 'after-download') {
        const newTranslator = await window.translation.createTranslator({
          sourceLanguage: 'en',
          targetLanguage: selectedLanguage
        });

        await handleTranslation(textToTranslate, newTranslator);
      } else {
        console.log('Translation not available for this language pair');
        setIsTranslationSupported(false);
      }
    } catch (error) {
      console.error('Translation check error:', error);
      setIsTranslationSupported(false);
    } finally {
      setIsCheckingTranslation(false);
    }
  }

  async function handleStreamingWrite() {
    if (!writer || !topic.trim()) return;

    try {
      setIsWriting(true);
      setWrittenContent('');

      const writeOptions: WriterOptions = {
        context: `Create detailed notes about the following topic:\n\n${topic}`,
        tone: writerTone,
        length: writerLength,
        format: "markdown"
      };

      let content = '';

      try {
        const stream = await writer.writeStreaming(topic, writeOptions);

        if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
          let receivedChunks = 0;
          for await (const chunk of stream) {
            if (typeof chunk === 'string') {
              if (chunk.trim() && !content.includes(chunk.trim())) {
                content += chunk;
                setWrittenContent(content);
                receivedChunks++;
              }
            }
          }

          if (receivedChunks === 0) {
            throw new Error('No meaningful chunks received');
          }
        } else {
          throw new Error('Invalid stream');
        }
      } catch (streamError) {
        console.warn("Streaming failed, falling back to regular write:", streamError);
        content = await writer.write(topic, writeOptions);
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
        context: sharedContext,
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

  async function handleTranslation(textToTranslate: string, currentTranslator: TranslatorInstance) {
    if (!currentTranslator || !textToTranslate || selectedLanguage === 'en') return;

    try {
      setIsTranslating(true);
      const translatedText = await currentTranslator.translate(textToTranslate);
      setTranslatedSummary(translatedText);
    } catch (error) {
      console.error("Translation error:", error);
      setTranslatedSummary('Error translating text');
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-h-screen">
      <div className="space-y-4">
        <Card className="p-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "write")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Summarize Notes</TabsTrigger>
              <TabsTrigger value="write">AI Writing Assistant</TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <div className="space-y-4">
                <FileUpload onFileUpload={setUploadedText} />
                <div>
                  <label className="block text-sm font-medium mb-1">Summarization Type:</label>
                  <Select value={summarizationType} onValueChange={(value) => setSummarizationType(value as SummarizationType)}>
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
                  <Select value={summarizationLength} onValueChange={(value) => setSummarizationLength(value as ContentLength)}>
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
            </TabsContent>
            <TabsContent value="write">
              <div className="space-y-4">
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter your prompt..."
                  className="min-h-[100px]"
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Tone:</label>
                  <Select value={writerTone} onValueChange={(value) => setWriterTone(value as WriterTone)}>
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
                  <Select value={writerLength} onValueChange={(value) => setWriterLength(value as ContentLength)}>
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
            </TabsContent>
          </Tabs>
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
            onClick={checkTranslationAndTranslate}
            disabled={
              isTranslating ||
              isCheckingTranslation ||
              selectedLanguage === 'en' ||
              (!summary && !writtenContent) ||
              isTranslationSupported === false
            }
            className="w-full mt-2"
          >
            {isCheckingTranslation ? 'translating...' :
              isTranslating ? 'Translating...' :
                'Translate'}
          </Button>

          {isTranslationSupported === false && (
            <p className="text-red-500 mt-2 text-sm">
              Translation is not available for this language.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {translatedSummary ? (
            <div className="prose max-w-none">
              <Markdown>{translatedSummary}</Markdown>
            </div>
          ) : summary ? (
            <div className="prose max-w-none">
              <Markdown>{summary}</Markdown>
            </div>
          ) : writtenContent ? (
            <div className="prose max-w-none">
              <Markdown>{writtenContent}</Markdown>
            </div>
          ) : null}
        </div>
      </Card>
    </div>)
}

export default Page;