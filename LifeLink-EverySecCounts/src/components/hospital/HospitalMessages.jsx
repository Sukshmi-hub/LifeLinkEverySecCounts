import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, User, Building2, Heart, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useSharedChat } from '@/context/SharedChatContext';

const predefinedReplies = {
  patient: [
    "Your case is under review",
    "Please visit the hospital",
    "Donor matching is in progress",
    "Emergency case escalated",
    "Your request has been approved",
    "Please submit additional documents",
    "Appointment scheduled for tomorrow",
  ],
  hospital: [
    "Patient referral received",
    "Organ availability confirmed",
    "Emergency coordination required",
    "Transfer approved",
    "Request for patient records",
  ],
  ngo: [
    "Patient requires urgent funding",
    "Medical documents shared",
    "Please review fund request",
    "Financial assistance approved",
    "Case escalated for priority review",
  ],
};

const HospitalMessages = () => {
  const { getThreadsForRole, sendMessage } = useSharedChat();
  const [selectedThread, setSelectedThread] = useState(null);
  const messagesEndRef = useRef(null);

  const hospitalId = 'hospital_001';
  const hospitalName = 'City General Hospital';

  // Get all threads for this hospital
  const threads = getThreadsForRole('hospital', hospitalId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedThread?.messages]);

  // Refresh selected thread when threads update
  useEffect(() => {
    if (selectedThread) {
      const updatedThread = threads.find(t => t.id === selectedThread.id);
      if (updatedThread) {
        setSelectedThread(updatedThread);
      }
    }
  }, [threads, selectedThread?.id]);

  const handleSendReply = (reply) => {
    if (!selectedThread) return;

    sendMessage(
      selectedThread.id,
      hospitalId,
      hospitalName,
      'hospital',
      reply
    );
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'patient': return <User className="w-4 h-4" />;
      case 'hospital': return <Building2 className="w-4 h-4" />;
      case 'ngo': return <Heart className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'patient': return 'bg-blue-100 text-blue-600';
      case 'hospital': return 'bg-amber-100 text-amber-600';
      case 'ngo': return 'bg-green-100 text-green-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getContactType = (thread) => {
    if (thread.participants.patient) return 'patient';
    if (thread.participants.ngo) return 'ngo';
    return 'hospital';
  };

  const getContactName = (thread) => {
    if (thread.participants.patient) return thread.participants.patient.name;
    if (thread.participants.ngo) return thread.participants.ngo.name;
    return 'Unknown';
  };

  const getCurrentReplies = () => {
    if (!selectedThread) return [];
    const contactType = getContactType(selectedThread);
    return predefinedReplies[contactType] || [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Messages</h2>
        <p className="text-muted-foreground">Controlled communication with patients & NGOs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Contacts List */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              {threads.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                threads.map((thread) => {
                  const contactType = getContactType(thread);
                  const contactName = getContactName(thread);
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={cn(
                        "flex items-center gap-3 p-4 cursor-pointer border-b border-border transition-colors",
                        selectedThread?.id === thread.id ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getRoleColor(contactType))}>
                        {getRoleIcon(contactType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm truncate">{contactName}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {thread.messages[thread.messages.length - 1]?.content || 'No messages yet'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(thread.lastActivity, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2">
          {!selectedThread ? (
            <CardContent className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">Choose a contact to start messaging</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getRoleColor(getContactType(selectedThread)))}>
                    {getRoleIcon(getContactType(selectedThread))}
                  </div>
                  <div>
                    <CardTitle className="text-base">{getContactName(selectedThread)}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">{getContactType(selectedThread)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[480px]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedThread.messages.map((message) => {
                      const isOwn = message.senderRole === 'hospital';
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                        >
                          <div className={cn(
                            "max-w-[70%] rounded-lg p-3",
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-br-none" 
                              : "bg-muted rounded-bl-none"
                          )}>
                            <p className="text-sm">{message.content}</p>
                            <p className={cn(
                              "text-xs mt-1",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Predefined Replies */}
                <div className="border-t border-border p-4">
                  <p className="text-xs text-muted-foreground mb-2">Quick Replies:</p>
                  <div className="flex flex-wrap gap-2">
                    {getCurrentReplies().map((reply, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSendReply(reply)}
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default HospitalMessages;