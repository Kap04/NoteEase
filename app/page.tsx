
import { Button } from "@/components/ui/button"
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="font-handwritten text-gray-800">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center p-4 bg-paper">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 pencil-effect">NoteEase</h1>
          <p className="text-2xl mb-8 pencil-effect">Effortless note-taking with AI assistance</p>
          <Link href="/s">
          <Button className="pencil-button text-xl py-6 px-8">Get Started</Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="min-h-screen flex flex-col justify-center items-center p-4 bg-paper">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center pencil-effect">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <FeatureCard
              title="AI-Powered Insights"
              description="Leverage Chrome's built-in AI APIs for smart suggestions and content analysis."
            />
            <FeatureCard
              title="Seamless Organization"
              description="Effortlessly categorize and structure your notes with intuitive tools."
            />
            <FeatureCard
              title="Cross-Device Sync"
              description="Access your notes anywhere, anytime, across all your devices."
            />
            <FeatureCard
              title="Collaborative Editing"
              description="Work together in real-time with easy sharing and permissions."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="min-h-screen flex flex-col justify-center items-center p-4 bg-paper">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center pencil-effect">How It Works</h2>
          <div className="space-y-12">
            <Step 
              number={1} 
              title="Upload Your Notes" 
              description="Easily upload your existing notes to NoteEase." 
            />
            <Step 
              number={2} 
              title="Generate Summaries" 
              description="Let our AI create concise summaries of your uploaded notes." 
            />
            <Step 
              number={3} 
              title="Create from Prompts" 
              description="Write new notes using AI-assisted prompts or keywords." 
            />
            <Step 
              number={4} 
              title="Translate" 
              description="Instantly translate your notes into various languages." 
            />
          </div>
        </div>
      </section>

      

      
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-2 border-gray-800 p-6 rounded-lg shadow-sketch">
      <h3 className="text-2xl font-bold mb-4 pencil-effect">{title}</h3>
      <p className="pencil-effect">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start">
      <div className="flex-shrink-0 border-2 border-gray-800 rounded-full w-12 h-12 flex items-center justify-center mr-4">
        <span className="text-2xl font-bold pencil-effect">{number}</span>
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2 pencil-effect">{title}</h3>
        <p className="pencil-effect">{description}</p>
      </div>
    </div>
  )
}

