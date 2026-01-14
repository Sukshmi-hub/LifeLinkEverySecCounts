import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  User, 
  Send, 
  MessageCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock initial messages per request
const getInitialMessages = (requestId) => [
  {
    id: `msg_${requestId}_1`,
    senderId: 'ngo_001',
    senderName: 'LifeLink NGO',
    senderRole: 'ngo',
    content: 'Hello, we have received the fund request for this patient. Could you please confirm the medical details?',
    timestamp: new Date(Date.now() - 86400000),
  },
  {
    id: `msg_${requestId}_2`,
    senderId: 'hospital_001',
    senderName: 'City General Hospital',
    senderRole: 'hospital',
    content: 'Yes, the patient is currently under our care. All medical documents have been verified and attached.',
    timestamp: new Date(Date.now() - 82800000),
  },
];

const NgoHospitalChat = ({
  isOpen,
  onClose,
  request,
}) => {
  const [messages, setMessages] = useState(new Map());
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef(null);

  // Initialize messages for this request
  useEffect(() => {
    if (request && !messages.has(request.id)) {
      setMessages(prev => new Map(prev).set(request.id, getInitialMessages(request.id)));
    }
  }, [request]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!request) return null;

  const currentMessages = messages.get(request.id) || [];

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'ngo_001',
      senderName: 'LifeLink NGO',
      senderRole: 'ngo',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = new Map(prev);
      const current = updated.get(request.id) || [];
      updated.set(request.id, [...current, newMessage]);
      return updated;
    });

    setInputMessage('');

    // Simulate hospital response after 1.5 seconds
    setTimeout(() => {
      const responses = [
        'Thank you for the update. We will process this accordingly.',
        'The patient is stable and awaiting the funding confirmation.',
        'We have received your message. Our team will review and respond shortly.',
        'All necessary documents are in order. Please proceed with the approval.',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const hospitalResponse = {
        id: `msg_${Date.now()}`,
        senderId: 'hospital_001',
        senderName: 'City General Hospital',
        senderRole: 'hospital',
        content: randomResponse,
        timestamp: new Date(),
      };

      setMessages(prev => {
        const updated = new Map(prev);
        const current = updated.get(request.id) || [];
        updated.set(request.id, [...current, hospitalResponse]);
        return updated;
      });
    }, 1500);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span>City General Hospital</span>
                <Badge variant="outline" className="text-xs">Online</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                <User className="w-3 h-3" />
                <span>Patient: {request.patientName}</span>
                <span className="text-xs">• Case ID: {request.id}</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {currentMessages.map((message) => (
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
                    <span className="text-xs opacity-60">{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
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
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This chat is for verification and fund coordination purposes only
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NgoHospitalChat;