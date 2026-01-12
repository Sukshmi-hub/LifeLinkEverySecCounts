import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  User,
  Building2,
  Heart,
  AlertTriangle,
  Search,
} from "lucide-react";

/* ---------------- MOCK DATA ---------------- */

const mockContacts = [
  {
    id: "contact_001",
    name: "City General Hospital",
    role: "hospital",
    lastMessage: "Your blood donation appointment is confirmed.",
    lastMessageTime: "10:30 AM",
    unread: 2,
    online: true,
  },
  {
    id: "contact_002",
    name: "Dr. Sarah Johnson",
    role: "hospital",
    lastMessage: "Thank you for your willingness to help.",
    lastMessageTime: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: "contact_003",
    name: "Hope Foundation NGO",
    role: "ngo",
    lastMessage: "We appreciate your contribution!",
    lastMessageTime: "Yesterday",
    unread: 1,
    online: true,
  },
  {
    id: "contact_004",
    name: "Admin Support",
    role: "admin",
    lastMessage: "Your profile has been verified.",
    lastMessageTime: "2 days ago",
    unread: 0,
    online: true,
  },
];

const mockMessages = {
  contact_001: [
    {
      id: "msg_001",
      senderId: "contact_001",
      senderName: "City General Hospital",
      senderRole: "hospital",
      content: "Hello! Thank you for registering as a donor.",
      timestamp: "10:00 AM",
    },
    {
      id: "msg_002",
      senderId: "user",
      senderName: "You",
      senderRole: "donor",
      content: "Happy to help! When do you need blood donors?",
      timestamp: "10:15 AM",
    },
    {
      id: "msg_003",
      senderId: "contact_001",
      senderName: "City General Hospital",
      senderRole: "hospital",
      content:
        "We have a blood drive this Saturday from 9 AM to 5 PM. Would you be available?",
      timestamp: "10:20 AM",
    },
    {
      id: "msg_004",
      senderId: "user",
      senderName: "You",
      senderRole: "donor",
      content: "Yes, I can come in the morning around 10 AM.",
      timestamp: "10:25 AM",
    },
    {
      id: "msg_005",
      senderId: "contact_001",
      senderName: "City General Hospital",
      senderRole: "hospital",
      content: "Your blood donation appointment is confirmed.",
      timestamp: "10:30 AM",
    },
  ],
};

/* ---------------- COMPONENT ---------------- */

function ChatSystem({ className = "" }) {
  const { user } = useAuth();

  const [contacts] = useState(mockContacts);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedContact) {
      setMessages(mockMessages[selectedContact.id] || []);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;

    const lower = newMessage.toLowerCase();
    const isEmergency =
      lower.includes("emergency") ||
      lower.includes("urgent") ||
      lower.includes("critical");

    const message = {
      id: `msg_${Date.now()}`,
      senderId: "user",
      senderName: user?.name || "You",
      senderRole: user?.role || "donor",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isEmergency,
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    setTimeout(() => {
      const reply = {
        id: `msg_${Date.now()}`,
        senderId: selectedContact.id,
        senderName: selectedContact.name,
        senderRole: selectedContact.role,
        content: isEmergency
          ? "🚨 EMERGENCY FLAGGED: Our team has been notified and will respond immediately."
          : "Thank you for your message. We will get back to you shortly.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, reply]);
    }, 1500);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "hospital":
        return <Building2 className="h-4 w-4" />;
      case "donor":
      case "ngo":
        return <Heart className="h-4 w-4" />;
      case "admin":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px] ${className}`}>
      {/* Contacts */}
      <Card className="md:col-span-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="divide-y divide-border">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedContact?.id === contact.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getRoleIcon(contact.role)}
                    </div>
                    {contact.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{contact.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {contact.lastMessageTime}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.lastMessage}
                    </p>
                  </div>

                  {contact.unread > 0 && (
                    <Badge>{contact.unread}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedContact ? (
          <>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getRoleIcon(selectedContact.role)}
                  </div>
                  {selectedContact.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedContact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedContact.online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      message.senderId === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    } ${
                      message.isEmergency
                        ? "border-2 border-destructive"
                        : ""
                    }`}
                  >
                    {message.isEmergency && (
                      <div className="flex items-center gap-1 text-xs mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        EMERGENCY
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start chatting</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default ChatSystem;
