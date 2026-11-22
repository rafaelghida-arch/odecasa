import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatApp } from "@/components/ChatApp";

export const metadata: Metadata = { title: "Conversa" };

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="app-height bg-bg" aria-busy="true" />}>
      <ChatApp />
    </Suspense>
  );
}
