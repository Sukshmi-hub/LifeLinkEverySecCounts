import React from "react";
import Header from "@/components/Header";
import ChatSystem from "@/components/ChatSystem";

function DonorChat() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            Chat with hospitals, NGOs, and support team
          </p>
        </div>

        <ChatSystem />
      </main>
    </div>
  );
}

export default DonorChat;
