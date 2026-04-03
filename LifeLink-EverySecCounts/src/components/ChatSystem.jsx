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
  Search,
  AlertTriangle,
} from "lucide-react";

/* ---------------- COMPONENT ---------------- */

function ChatSystem({ className = "" }) {
  const { user } = useAuth();

  // State for real data
  const [contacts, setContacts] = useState([]); // Initialize as empty array
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]); // Initialize as empty array
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const getIdentity = () => {
    const ids = new Set([String(user?.id || user?._id || '')]);
    const roles = new Set([String(user?.role || '').toLowerCase()]);
    const names = new Set([String(user?.name || user?.fullName || user?.organizationName || '').trim().toLowerCase()]);

    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      if (stored) {
        if (stored.id) ids.add(String(stored.id));
        if (stored._id) ids.add(String(stored._id));
        if (stored.userId) ids.add(String(stored.userId));
        if (stored.role) roles.add(String(stored.role).toLowerCase());
        const storedName = stored.name || stored.fullName || stored.organizationName;
        if (storedName) names.add(String(storedName).trim().toLowerCase());
      }
    } catch (e) {}

    try {
      const storedAuth = JSON.parse(localStorage.getItem('lifelink_auth') || '{}');
      const current = storedAuth?.user || storedAuth;
      if (current) {
        if (current.id) ids.add(String(current.id));
        if (current._id) ids.add(String(current._id));
        if (current.userId) ids.add(String(current.userId));
        if (current.role) roles.add(String(current.role).toLowerCase());
        const currentName = current.name || current.fullName || current.organizationName;
        if (currentName) names.add(String(currentName).trim().toLowerCase());
      }
    } catch (e) {}

    return { ids, roles, names };
  };

  // 1. Fetch Contacts on load
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        // Replace with your actual API call: 
        // const response = await fetch('/api/contacts');
        // const data = await response.json();
        // setContacts(data);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    fetchContacts();
  }, []);

  // 2. Fetch Messages when a contact is selected
  useEffect(() => {
    if (selectedContact) {
      const fetchMessages = async () => {
        setIsLoading(true);
        try {
          // Replace with your actual API call:
          // const response = await fetch(`/api/messages/${selectedContact.id}`);
          // const data = await response.json();
          // setMessages(data);
        } catch (error) {
          console.error("Error fetching messages:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMessages();
    }
  }, [selectedContact]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    const lower = newMessage.toLowerCase();
    const isEmergency =
      lower.includes("emergency") ||
      lower.includes("urgent") ||
      lower.includes("critical");

    const messageData = {
      senderId: user?.id || "user",
      receiverId: selectedContact.id,
      content: newMessage,
      isEmergency,
      timestamp: new Date().toISOString(),
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, { ...messageData, id: Date.now(), senderName: "You" }]);
    setNewMessage("");

    try {
      // Replace with your API call to save message
      // await fetch('/api/messages/send', { method: 'POST', body: JSON.stringify(messageData) });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "hospital": return <Building2 className="h-4 w-4" />;
      case "donor":
      case "ngo": return <Heart className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px] ${className}`}>
      {/* Contacts List */}
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
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
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
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{contact.name}</p>
                        <span className="text-xs text-muted-foreground">{contact.lastMessageTime}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                    </div>
                    {contact.unread > 0 && <Badge variant="destructive">{contact.unread}</Badge>}
                  </div>
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">No contacts found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedContact ? (
          <>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {getRoleIcon(selectedContact.role)}
                </div>
                <div>
                  <p className="font-medium">{selectedContact.name}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${(() => {
                    const senderId = String(message.senderId || '').trim()
                    const senderRole = String(message.senderRole || '').trim().toLowerCase()
                    const senderName = String(message.senderName || '').trim().toLowerCase()
                    const { ids, roles, names } = getIdentity()
                    return (ids.has(senderId) || roles.has(senderRole) || names.has(senderName)) ? "justify-end" : "justify-start"
                  })()}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      (() => {
                        const senderId = String(message.senderId || '').trim()
                        const senderRole = String(message.senderRole || '').trim().toLowerCase()
                        const senderName = String(message.senderName || '').trim().toLowerCase()
                        const { ids, roles, names } = getIdentity()
                        return (ids.has(senderId) || roles.has(senderRole) || names.has(senderName))
                      })()
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    } ${message.isEmergency ? "border-2 border-destructive" : ""}`}
                  >
                    {message.isEmergency && (
                      <div className="flex items-center gap-1 text-xs mb-1 font-bold">
                        <AlertTriangle className="h-3 w-3" /> EMERGENCY
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">{message.timestamp}</p>
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
                  className="flex-1 rounded-full"
                />
                <Button type="submit" size="icon" className="rounded-full">
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
