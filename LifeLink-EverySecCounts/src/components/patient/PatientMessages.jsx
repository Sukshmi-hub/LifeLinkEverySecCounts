import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Building2, Send, Clock, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useSharedChat } from '@/context/SharedChatContext';
import { useAuth } from '@/context/AuthContext';

const PatientMessages = () => {
  const { user } = useAuth();
  const { getThreadsForRole, sendMessage } = useSharedChat();
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const patientId = user?.id || 'patient_001';
  const patientName = user?.name || 'Patient User';
  
  // Get all threads where this patient is a participant
  const threads = getThreadsForRole('patient', patientId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedThread?.messages]);

  // Sync selected thread data if it updates in the background
  useEffect(() => {
    if (selectedThread) {
      const updatedThread = threads.find(t => t.id === selectedThread.id);
      if (updatedThread) {
        setSelectedThread(updatedThread);
      }
    }
  }, [threads, selectedThread?.id]);

  const handleSendMessage = () => {
    if (!selectedThread || !newMessage.trim()) return;

    sendMessage(
      selectedThread.id,
      patientId,
      patientName,
      'patient',
      newMessage.trim()
    );

    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to identify if the patient is talking to a Hospital or an NGO
  const getContactInfo = (thread) => {
    if (thread.participants.hospital) {
      return {
        name: thread.participants.hospital.name,
        role: 'Hospital',
        icon: <Building2 className="w-5 h-5 text-blue-600" />,
        bgColor: 'bg-blue-100',
      };
    }
    if (thread.participants.ngo) {
      return {
        name: thread.participants.ngo.name,
        role: 'NGO',
        icon: <Heart className="w-5 h-5 text-green-600" />,
        bgColor: 'bg-green-100',
      };
    }
    return { name: 'Support', role: 'Staff', icon: <User />, bgColor: 'bg-gray-100' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Messages</h2>
        <p className="text-muted-foreground">Communication with Hospitals & NGOs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Left Sidebar: List of Conversations */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Active Chats</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              {threads.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations found</p>
                </div>
              ) : (
                threads.map((thread) => {
                  const contact = getContactInfo(thread);
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={cn(
                        "flex items-center gap-3 p-4 cursor-pointer border-b border-border transition-colors",
                        selectedThread?.id === thread.id ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", contact.bgColor)}>
                        {contact.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{contact.name}</h4>
                        <p className="text-xs text-muted-foreground truncate italic">
                          {contact.role}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {thread.messages[thread.messages.length - 1]?.content || 'Start a chat...'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Area: The Actual Chat Window */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {!selectedThread ? (
            <CardContent className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium">Open a conversation</h3>
                <p className="text-sm text-muted-foreground">Select a contact to view history</p>
              </div>
            </CardContent>
          ) : (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b border-border py-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getContactInfo(selectedThread).bgColor)}>
                    {getContactInfo(selectedThread).icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{getContactInfo(selectedThread).name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{getContactInfo(selectedThread).role}</p>
                  </div>
                </div>
              </CardHeader>

              {/* Chat Messages List */}
              <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-4 bg-muted/5">
                  <div className="space-y-4">
                    {selectedThread.messages.map((message) => {
                      const isOwn = message.senderRole === 'patient';
                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                        >
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-tr-none" 
                              : "bg-white border border-border rounded-tl-none text-foreground"
                          )}>
                            <p className="text-sm">{message.content}</p>
                            <div className={cn(
                                "text-[10px] mt-1 flex items-center gap-1",
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input Bar */}
                <div className="p-4 bg-background border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message to the hospital/NGO..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
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

export default PatientMessages;