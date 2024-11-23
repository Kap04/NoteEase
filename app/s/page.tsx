//Translator API token : AhIRJEmV6LpVBXzgt9OGrM3imvdz8Nm48T6pCc5vzAL3ZIKbnuZFB/0QSuL9lZSvQbkkwUA3NWmoADetLZb/NAgAAABueyJvcmlnaW4iOiJodHRwczovL25vdGVlYXNlLnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6IlRyYW5zbGF0aW9uQVBJIiwiZXhwaXJ5IjoxNzUzMTQyNDAwLCJpc1N1YmRvbWFpbiI6dHJ1ZX0=
//Language detector API token : AuCMy2WPLqYq4osxWW6EP3+ATdoc16f1vFHAlVCWGUL5PafEWD74C431HEKdzQU9jvhPm4Kw/6BN0tiOhOF1ew0AAAB0eyJvcmlnaW4iOiJodHRwczovL25vdGVlYXNlLnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6Ikxhbmd1YWdlRGV0ZWN0aW9uQVBJIiwiZXhwaXJ5IjoxNzQ5NTk5OTk5LCJpc1N1YmRvbWFpbiI6dHJ1ZX0=

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
}

declare global {
  interface Window {
    ai: AI;
  }
}

function Page() {
  const [summarizer, setSummarizer] = useState<any>(null);
  const [uploadedText, setUploadedText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Summarization configuration state
  const [summarizationType, setSummarizationType] = useState<'key-points' | 'tl;dr' | 'teaser' | 'headline'>('key-points');
  const [summarizationLength, setSummarizationLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [sharedContext, setSharedContext] = useState<string>('');

  useEffect(() => {
    async function initializeSummarizer() {
      const apiKey = "ApwWWZ4FuIAquQu5SWgRRB9dExHt76gc7yVN4Wo8hPdztL3M1284HOwIydPLt+gpZBrHJ0g/hkY4JC0WMIFOmwUAAAByeyJvcmlnaW4iOiJodHRwczovL25vdGVlYXNlLnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6IkFJU3VtbWFyaXphdGlvbkFQSSIsImV4cGlyeSI6MTc1MzE0MjQwMCwiaXNTdWJkb21haW4iOnRydWV9"; 

      if (!window.ai || !window.ai.summarizer) {
        console.error("Summarizer API is not supported in this browser.");
        return;
      }

      const capabilities = await window.ai.summarizer.capabilities({
        apiKey,
      });

      if (capabilities.available === "no") {
        console.error("Summarizer API is not usable at the moment.");
        return;
      }

      const options = {
        sharedContext: "This is a general-purpose text summarization context.",
        type: "key-points",
        format: "markdown",
        length: "medium",
        apiKey,
      };

      if (capabilities.available === "readily") {
        const summarizer = await window.ai.summarizer.create(options);
        setSummarizer(summarizer);
      } else if (capabilities.available === "after-download") {
        const summarizer = await window.ai.summarizer.create({
          ...options,
          monitor: (monitor: any) => {
            monitor.addEventListener("downloadprogress", (event: any) => {
              console.log(`Downloaded ${event.loaded} of ${event.total} bytes.`);
            });
          },
        });
        await summarizer.ready;
        setSummarizer(summarizer);
      }
    }

    initializeSummarizer();
  }, []);

  async function handleStreamingSummarize() {
    try {
      setIsLoading(true);
      setSummary('');
      
      if (summarizer && uploadedText.trim()) {
        const stream = await summarizer.summarizeStreaming(uploadedText, {
          context: sharedContext || "Provide a clear and concise summary of the uploaded document.",
        });

        // const summarizationOptions = {
        //   type: summarizationType,
        //   length: summarizationLength
        // };

        // let result = '';
        let previousLength = 0;

        for await (const segment of stream) {
          const newContent = segment.slice(previousLength);
          setSummary(prevSummary => prevSummary + newContent);
          previousLength = segment.length;
        }
      }
    } catch (error) {
      console.error("Error in streaming summarization:", error);
      setSummary('Error generating summary');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/3 p-4 border-r  overflow-y-auto">
        <h1 className="text-2xl  font-bold mb-4">Document Summarization Tool</h1>

        <FileUpload onFileUpload={(content) => {
          setUploadedText(content);
        }}/>
        
        <div className="mt-4 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Summarization Type</label>
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
            <label className="block mb-2 font-medium">Summarization Length</label>
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

          <div>
            <label className="block mb-2 font-medium">Shared Context (Optional)</label>
            <textarea 
              value={sharedContext}
              onChange={(e) => setSharedContext(e.target.value)}
              placeholder="Additional context to help with summarization..."
              className="w-full p-2 border rounded h-20"
            />
          </div>
          
          <button 
            onClick={handleStreamingSummarize}
            disabled={!uploadedText.trim() || isLoading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {isLoading ? 'Summarizing...' : 'Summarize Document'}
          </button>
        </div>
      </div>
      
      <div className="w-2/3 p-4 overflow-y-auto">
        {summary ? (
          <div className="p-4 border rounded bg-gray-50">
            <h2 className="font-bold mb-2">Summary:</h2>
            <Markdown>{summary}</Markdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Your notes will appear here
          </div>
        )}
      </div>
    </div>
  );
}

export default Page;

