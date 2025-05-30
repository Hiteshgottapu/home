'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export function AIAssistant() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    setError(null);
    try {
      const res = await fetch('/api/ai-assistant/ask', { // Updated API path
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      setAnswer(data.answer);
    } catch (err: any) {
      setError(err.message || 'Failed to get an answer. Please try again.');
      setAnswer(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">OpenAI Assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Ask me anything..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          className="border-input focus:ring-primary"
        />
        <Button
          onClick={ask}
          disabled={!question.trim() || loading}
          className="w-full"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Thinking...' : 'Ask OpenAI'}
        </Button>
        
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/30">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {answer && (
          <div className="mt-4 p-4 bg-muted rounded-md border">
            <h3 className="font-semibold mb-2 text-lg text-foreground">Answer:</h3>
            <pre className="whitespace-pre-wrap text-sm text-foreground/90">{answer}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
