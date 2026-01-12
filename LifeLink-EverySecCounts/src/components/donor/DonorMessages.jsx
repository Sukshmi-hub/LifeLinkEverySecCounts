import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Building2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const predefinedDonorReplies = [
  "I am available for the procedure",
  "When should I visit the hospital?",
  "Any update on verification?",
  "Please confirm next steps",
  "I have completed the required tests",
  "What documents do I need to bring?",
];

const DonorMessages = () => {
  const [chats, setChats] = useState([
    {
      id: 'chat_1',
      hospitalName: 'City General Hospital',
      lastMessage: 'Your documents are verified',
      unread: 1,
      messages: [
        {
          id: 'msg_1',
          sender: 'hospital',
          content: 'Thank you for registering as a donor.',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: 'msg_2',
          sender: 'hospital',
          content: 'Your documents are verified',
          timestamp: new Date(Date.now() - 1800000),
        },
      ],
    },
    {
      id: 'chat_2',
      hospitalName: 'Metro Medical Center',
      lastMessage: 'Medical screening scheduled',
      unread: 0,
      messages: [
        {
          id: 'msg_3',
          sender: 'hospital',
          content: 'Medical screening scheduled for tomorrow',
          timestamp: new Date(Date.now() - 7200000),
        },
      ],
    },
  ]);

  const [selectedChat, setSelectedChat] = useState(null);

  const handleSendPredefinedMessage = (message) => {
    if (!selectedChat) return;

    const newMessage = {
      id: `msg_${Date.now()}`,
      sender: 'donor',
      content: message,
      timestamp: new Date(),
    };

    setChats(prev =>
      prev.map(chat =>
        chat.id === selectedChat.id
          ? {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: message,
            }
          : chat
      )
    );

    setSelectedChat(prev =>
      prev ? { ...prev, messages: [...prev.messages, newMessage] } : null
    );

    // Simulate hospital response after delay
    setTimeout(() => {
      const hospitalResponses = [
        "Your documents are verified",
        "Medical screening scheduled",
        "Please report tomorrow",
        "Donation process is in progress",
        "Thank you for your cooperation",
      ];
      const randomResponse =
        hospitalResponses[Math.floor(Math.random() * hospitalResponses.length)];

      const responseMessage = {
        id: `msg_${Date.now()}_resp`,
        sender: 'hospital',
        content: randomResponse,
        timestamp: new Date(),
      };

      setChats(prev =>
        prev.map(chat =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                messages: [...chat.messages, newMessage, responseMessage],
                lastMessage: randomResponse,
              }
            : chat
        )
      );

      setSelectedChat(prev =>
        prev
          ? { ...prev, messages: [...prev.messages, responseMessage] }
          : null
      );
    }, 1500);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Chat List Sidebar */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            Hospital Chats
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => {
                  setSelectedChat(chat);
                  setChats(prev =>
                    prev.map(c =>
                      c.id === chat.id ? { ...c, unread: 0 } : c
                    )
                  );
                }}
                className={cn(
                  "w-full p-4 text-left border-b border-border transition-colors",
                  selectedChat?.id === chat.id
                    ? "bg-primary/10"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground truncate">
                        {chat.hospitalName}
                      </p>
                      {chat.unread > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Chat Window */}
      <Card className="lg:col-span-2 flex flex-col">
        {selectedChat ? (
          <>
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {selectedChat.hospitalName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Controlled chat • Predefined replies only
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {selectedChat.messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender === 'donor'
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                          message.sender === 'donor'
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1 opacity-70",
                            message.sender === 'donor'
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Quick Reply Selection Area */}
              <div className="p-4 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground mb-3">
                  Select a message to send:
                </p>
                <div className="flex flex-wrap gap-2">
                  {predefinedDonorReplies.map((reply, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 px-3 whitespace-normal text-left max-w-xs"
                      onClick={() => handleSendPredefinedMessage(reply)}
                    >
                      <Send className="h-3 w-3 mr-2 shrink-0" />
                      {reply}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Select a chat to start messaging</p>
              <p className="text-sm">
                Choose a hospital from the list to view the conversation
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default DonorMessages;