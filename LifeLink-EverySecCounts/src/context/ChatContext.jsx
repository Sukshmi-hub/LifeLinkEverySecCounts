import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

const ChatContext = createContext(undefined);

/* ---------------- MOCK DATA ---------------- */

const initialChats = [
  {
    id: "chat_001",
    participants: [
      { id: "usr_001", name: "John Patient", role: "patient" },
      { id: "usr_003", name: "City General Hospital", role: "hospital" },
    ],
    messages: [
      {
        id: "msg_001",
        senderId: "usr_001",
        senderName: "John Patient",
        senderRole: "patient",
        content:
          "Hello, I need to inquire about my blood request status.",
        timestamp: "2024-03-10T10:00:00",
        isEmergency: false,
        read: true,
      },
      {
        id: "msg_002",
        senderId: "usr_003",
        senderName: "City General Hospital",
        senderRole: "hospital",
        content:
          "Hello John! Your blood request #REQ001 is currently being processed. We have found a matching donor.",
        timestamp: "2024-03-10T10:05:00",
        isEmergency: false,
        read: true,
      },
    ],
    lastActivity: "2024-03-10T10:05:00",
    hasEmergency: false,
  },
  {
    id: "chat_002",
    participants: [
      { id: "usr_002", name: "Sarah Donor", role: "donor" },
      { id: "usr_003", name: "City General Hospital", role: "hospital" },
    ],
    messages: [
      {
        id: "msg_003",
        senderId: "usr_003",
        senderName: "City General Hospital",
        senderRole: "hospital",
        content:
          "Thank you for registering as a donor! We have a patient who matches your blood type.",
        timestamp: "2024-03-10T09:30:00",
        isEmergency: false,
        read: true,
      },
      {
        id: "msg_004",
        senderId: "usr_002",
        senderName: "Sarah Donor",
        senderRole: "donor",
        content:
          "I am available to donate. When should I come in?",
        timestamp: "2024-03-10T09:45:00",
        isEmergency: false,
        read: false,
      },
    ],
    lastActivity: "2024-03-10T09:45:00",
    hasEmergency: false,
  },
];

const autoReplies = {
  hospital: [
    "Thank you for your message. Our team is reviewing your request.",
    "We will get back to you shortly with more information.",
    "Your request has been prioritized. A coordinator will contact you soon.",
    "We have noted your concern and are taking immediate action.",
  ],
  donor: [
    "Thank you for your willingness to help!",
    "Your donation could save lives. We appreciate your commitment.",
    "We will coordinate the donation process shortly.",
  ],
  patient: [
    "We understand your concern and are here to help.",
    "Your health is our priority. Please stay calm.",
    "We are working on finding the best solution for you.",
  ],
  ngo: [
    "Thank you for reaching out. Our support team is ready to assist.",
    "We are committed to helping those in need.",
  ],
  admin: [
    "Your query has been escalated to the admin team.",
    "We are reviewing the situation and will respond promptly.",
  ],
};

/* ---------------- PROVIDER ---------------- */

export function ChatProvider({ children }) {
  const [chats, setChats] = useState(initialChats);
  const [activeChat, setActiveChatState] = useState(null);

  const setActiveChat = useCallback(
    (chatId) => {
      if (chatId === null) {
        setActiveChatState(null);
      } else {
        const chat = chats.find((c) => c.id === chatId);
        setActiveChatState(chat || null);
      }
    },
    [chats]
  );

  const sendMessage = useCallback(
    (
      chatId,
      content,
      senderId,
      senderName,
      senderRole,
      isEmergency = false
    ) => {
      const newMessage = {
        id: `msg_${Date.now()}`,
        senderId,
        senderName,
        senderRole,
        content,
        timestamp: new Date().toISOString(),
        isEmergency,
        read: false,
      };

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, newMessage],
                lastActivity: newMessage.timestamp,
                hasEmergency:
                  chat.hasEmergency || isEmergency,
              }
            : chat
        )
      );

      // Auto-reply simulation
      setTimeout(() => {
        const chat = chats.find((c) => c.id === chatId);
        if (!chat) return;

        const otherParticipant = chat.participants.find(
          (p) => p.id !== senderId
        );
        if (!otherParticipant) return;

        const replies =
          autoReplies[otherParticipant.role] ||
          autoReplies.hospital;

        const randomReply =
          replies[Math.floor(Math.random() * replies.length)];

        const autoReply = {
          id: `msg_${Date.now()}_auto`,
          senderId: otherParticipant.id,
          senderName: otherParticipant.name,
          senderRole: otherParticipant.role,
          content: isEmergency
            ? "🚨 EMERGENCY ACKNOWLEDGED: Our team is responding immediately. Stay on the line."
            : randomReply,
          timestamp: new Date().toISOString(),
          isEmergency: false,
          read: false,
        };

        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, autoReply],
                  lastActivity: autoReply.timestamp,
                }
              : chat
          )
        );
      }, 2000);
    },
    [chats]
  );

  const createChat = useCallback((participants) => {
    const newChat = {
      id: `chat_${Date.now()}`,
      participants,
      messages: [],
      lastActivity: new Date().toISOString(),
      hasEmergency: false,
    };

    setChats((prev) => [...prev, newChat]);
    return newChat;
  }, []);

  const getUnreadCount = useCallback(
    (userId) => {
      return chats.reduce((count, chat) => {
        const unread = chat.messages.filter(
          (m) => m.senderId !== userId && !m.read
        ).length;
        return count + unread;
      }, 0);
    },
    [chats]
  );

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        setActiveChat,
        sendMessage,
        createChat,
        getUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

/* ---------------- HOOK ---------------- */

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error(
      "useChat must be used within a ChatProvider"
    );
  }
  return context;
}
