import { useState } from 'react';
import { UploadInterface } from './components/UploadInterface';
import { EnrichedDashboard } from './components/EnrichedDashboard';
import { ChatInterface } from './components/ChatInterface';
import { API_BASE_URL } from './services/api';

type AppState = 'upload' | 'processing' | 'dashboard' | 'chat';

interface ProcessingState {
  sessionId: string;
  companyName: string;
  files: Array<{ filename: string; entries: number }>;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('upload');
  const [processing, setProcessing] = useState<ProcessingState | null>(null);

  const handleUploadSuccess = (sessionId: string, files: Array<{ filename: string; entries: number }>) => {
    setProcessing({
      sessionId,
      companyName: files[0]?.filename?.split('FEC')?.[0] || 'Company',
      files,
    });

    // Auto-trigger processing
    handleStartProcessing(sessionId);
  };

  const handleStartProcessing = async (sessionId: string) => {
    setAppState('processing');

    try {
      // Call process endpoint
      const response = await fetch(`${API_BASE_URL}/api/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          company_name: processing?.companyName || 'Company',
        }),
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      // Show dashboard when processing is complete
      setAppState('dashboard');
    } catch (error) {
      console.error('Processing error:', error);
      // Go back to upload on error
      setAppState('upload');
      setProcessing(null);
    }
  };

  const handleShowChat = () => {
    setAppState('chat');
  };

  const handleBackToDashboard = () => {
    setAppState('dashboard');
  };

  // Render based on state
  if (appState === 'upload') {
    return <UploadInterface onUploadSuccess={handleUploadSuccess} onProcessStart={() => {}} />;
  }

  if (appState === 'processing' && processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing FEC File</h2>
          <p className="text-gray-600">
            Analyzing financial data for {processing.companyName}...
          </p>
          <p className="text-sm text-gray-500 mt-4">
            {processing.files[0]?.entries.toLocaleString()} entries to process
          </p>
          <p className="text-xs text-gray-400 mt-8">This may take 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (appState === 'dashboard' && processing) {
    return (
      <EnrichedDashboard
        sessionId={processing.sessionId}
        companyName={processing.companyName}
        onShowChat={handleShowChat}
      />
    );
  }

  if (appState === 'chat' && processing) {
    return (
      <ChatInterface sessionId={processing.sessionId} onBack={handleBackToDashboard} />
    );
  }

  // Fallback
  return <UploadInterface onUploadSuccess={handleUploadSuccess} onProcessStart={() => {}} />;
}
