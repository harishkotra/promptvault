"use client";

interface Props {
  plaintext: string | null;
  isLoading: boolean;
  error: string | null;
}

export function PromptViewer({ plaintext, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="animate-pulse p-4 bg-gray-100 rounded">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (!plaintext) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 border rounded">
      <h4 className="font-semibold mb-2">Prompt</h4>
      <pre className="whitespace-pre-wrap text-sm font-mono">{plaintext}</pre>
    </div>
  );
}
