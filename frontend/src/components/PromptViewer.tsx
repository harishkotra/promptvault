"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  plaintext: string | null;
  isLoading: boolean;
  error: string | null;
}

export function PromptViewer({ plaintext, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  if (!plaintext) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Decrypted Prompt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{plaintext}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
