import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  User,
  Send, 
  MessageCircle,
  Clock,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock threads
const initialThreads = [
  {
    id: 'thread_ngo_h1',
    participantName: 'City General Hospital',
    participantRole: 'hospital',
    patientName: 'Rajesh Kumar',
    caseId: 'fund_001',
    messages: [
      {
        id: 'msg_1',
        senderId: 'hospital_001',
        senderName: 'City General Hospital',
        senderRole: 'hospital',
        content: 'Patient requires urgent funding for kidney transplant.',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: 'msg_2',
        senderId: 'ngo_001',
        senderName: 'LifeLink NGO',
        senderRole: 'ngo',
        content: 'We have received the request. Please share the medical documents.',
        timestamp: new Date(Date.now() - 3000000),
      },
    ],
    lastActivity: new Date(Date.now() - 3000000),
    unread: 1,
  },
  {
    id: 'thread_ngo_h2',
    participantName: 'Metro Healthcare Center',
    participantRole: 'hospital',
    patientName: 'Sunita Devi',
    caseId: 'fund_002',
    messages: [
      {
        id: 'msg_3',
        senderId: 'hospital_002',
        senderName: 'Metro Healthcare Center',
        senderRole: 'hospital',
        content: 'Emergency case - patient needs immediate financial support.',
        timestamp: new Date(Date.now() - 86400000),
      },
    ],
    lastActivity: new Date(Date.now() - 86400000),
    unread: 0,
  },
  {
    id: 'thread_ngo_p1',
    participantName: 'Amit Sharma',
    participantRole: 'patient',
    messages: [
      {
        id: 'msg_4',
        senderId: 'patient_001',
        senderName: 'Amit Sharma',
        senderRole: 'patient',
        content: 'Thank you for approving my funding request.',
        timestamp: new Date(Date.now() - 172800000),
      },
      {
        id: 'msg_5',
        senderId: 'ngo_001',
        senderName: 'LifeLink NGO',
        senderRole: 'ngo',
        content: 'You are welcome! We wish you a speedy recovery.',
        timestamp: new Date(Date.now() - 170000000),
      },
    ],
    lastActivity: new Date(Date.now() - 170000000),
    unread: 0,
  },
];

const NgoMessages = () => {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThread, setSelectedThread] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredThreads = threads.filter(thread =>
    thread.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.patientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedThread) return;

    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'ngo_001',
      senderName: 'LifeLink NGO',
      senderRole: 'ngo',
      content: inputMessage,
      timestamp: new Date(),
    };

    setThreads(prev => prev.map(thread => {
      if (thread.id === selectedThread.id) {
        return {
          ...thread,
          messages: [...thread.messages, newMessage],
          lastActivity: new Date(),
        };
      }
      return thread;
    }));

    setSelectedThread(prev => prev ? {
      ...prev,
      messages: [...prev.messages, newMessage],
      lastActivity: new Date(),
    } : null);

    setInputMessage('');

    // Simulate response
    setTimeout(() => {
      const responses = selectedThread.participantRole === 'hospital' 
        ? [
            'Thank you for the update. We will proceed accordingly.',
            'The patient is stable and ready for the procedure.',
            'All documents have been verified and submitted.',
          ]
        : [
            'Thank you so much for your support.',
            'I really appreciate the help from LifeLink.',
            'God bless you and your team.',
          ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const responseMessage = {
        id: `msg_${Date.now()}`,
        senderId: selectedThread.participantRole === 'hospital' ? 'hospital_001' : 'patient_001',
        senderName: selectedThread.participantName,
        senderRole: selectedThread.participantRole,
        content: randomResponse,
        timestamp: new Date(),
      };

      setThreads(prev => prev.map(thread => {
        if (thread.id === selectedThread.id) {
          return {
            ...thread,
            messages: [...thread.messages, responseMessage],
            lastActivity: new Date(),
          };
        }
        return thread;
      }));

      setSelectedThread(prev => prev ? {
        ...prev,
        messages: [...prev.messages, responseMessage],
        lastActivity: new Date(),
      } : null);
    }, 1500);
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Chat List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Conversations
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 border-b border-border transition-colors",
                  selectedThread?.id === thread.id && "bg-muted"
                )}
                onClick={() => {
                  setSelectedThread(thread);
                  setThreads(prev => prev.map(t => 
                    t.id === thread.id ? { ...t, unread: 0 } : t
                  ));
                }}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  thread.participantRole === 'hospital' ? "bg-success/20" : "bg-primary/20"
                )}>
                  {thread.participantRole === 'hospital' ? (
                    <Building2 className="w-5 h-5 text-success" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{thread.participantName}</p>
                    <span className="text-xs text-muted-foreground">{formatTime(thread.lastActivity)}</span>
                  </div>
                  {thread.patientName && (
                    <p className="text-xs text-muted-foreground">Patient: {thread.patientName}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">
                    {thread.messages[thread.messages.length - 1]?.content}
                  </p>
                </div>
                {thread.unread > 0 && (
                  <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center">
                    {thread.unread}
                  </Badge>
                )}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Window */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedThread ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  selectedThread.participantRole === 'hospital' ? "bg-success/20" : "bg-primary/20"
                )}>
                  {selectedThread.participantRole === 'hospital' ? (
                    <Building2 className="w-5 h-5 text-success" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">{selectedThread.participantName}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedThread.participantRole === 'hospital' && selectedThread.patientName && (
                      <>Patient: {selectedThread.patientName} • Case: {selectedThread.caseId}</>
                    )}
                    {selectedThread.participantRole === 'patient' && 'Patient'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.senderRole === 'ngo' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-3",
                          message.senderRole === 'ngo'
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-1",
                            message.senderRole === 'ngo' ? "justify-end" : "justify-start"
                          )}
                        >
                          <Clock className="w-3 h-3 opacity-60" />
                          <span className="text-xs opacity-60">
                            {message.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center gap-3">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={!inputMessage.trim()} className="gap-2">
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NgoMessages;