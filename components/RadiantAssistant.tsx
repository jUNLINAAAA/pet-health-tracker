"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { Bot, Send, X, MessageCircle, Sparkles, Plus, Trash2, Menu, ChevronLeft, MoreVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssistantService, ConversationService, type Conversation } from "@/lib/services";
import { useHealth } from "@/lib/health-context";
import { toast } from "sonner";

interface RadiantAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

const starterMessage: ChatMessage = {
  id: "assistant-starter",
  role: "assistant",
  content: "Hello! I'm Dr. Radiant, your virtual veterinarian. I have access to your pet's complete health records, alerts, and upcoming appointments. How can I help with your pet's care today?",
};

export function RadiantAssistant({ open, onOpenChange }: RadiantAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pets } = useHealth();
  const [activePetId, setActivePetId] = useState<string | undefined>(undefined);

  // Conversation management state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Smooth spring animation for panel movement
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 400, damping: 30 });

  useEffect(() => {
    if (pets && pets.length > 0) {
      setActivePetId(pets[0].id);
    }
  }, [pets]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    // Auto-focus input when opened
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const convos = await ConversationService.getConversations(activePetId);
      setConversations(convos);
      return convos;
    } catch (err) {
      console.error("Error loading conversations:", err);
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [activePetId]);

  // Load messages for active conversation
  const loadConversationMessages = useCallback(async (conversationId: string) => {
    setLoadingHistory(true);
    setError(null);
    try {
      const msgs = await ConversationService.getConversationMessages(conversationId);
      if (msgs.length > 0) {
        setMessages(msgs.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
      } else {
        setMessages([starterMessage]);
      }
    } catch (err) {
      setError("Could not load conversation");
      console.error("Load messages error:", err);
      setMessages([starterMessage]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Load conversation history once panel opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const init = async () => {
      const convos = await loadConversations();

      if (cancelled) return;

      // If there's an active conversation, load its messages
      if (activeConversationId) {
        await loadConversationMessages(activeConversationId);
      } else if (convos.length > 0) {
        // Load the most recent conversation
        setActiveConversationId(convos[0].id);
        await loadConversationMessages(convos[0].id);
      } else {
        // No conversations, show starter message
        setMessages([starterMessage]);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [open, activePetId, loadConversations, loadConversationMessages, activeConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const pushMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

  // Create a new conversation
  const handleNewConversation = async () => {
    try {
      const newConvo = await ConversationService.createConversation("New Chat", activePetId);
      if (newConvo) {
        setConversations((prev) => [newConvo, ...prev]);
        setActiveConversationId(newConvo.id);
        setMessages([starterMessage]);
        setShowConversationList(false);
        toast.success("New conversation started");
      }
    } catch (err) {
      console.error("Error creating conversation:", err);
      toast.error("Could not create new conversation");
    }
  };

  // Switch to a conversation
  const handleSelectConversation = async (convo: Conversation) => {
    setActiveConversationId(convo.id);
    await loadConversationMessages(convo.id);
    setShowConversationList(false);
  };

  // Delete a conversation
  const handleDeleteConversation = async (convoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ConversationService.deleteConversation(convoId);
      setConversations((prev) => prev.filter((c) => c.id !== convoId));

      if (activeConversationId === convoId) {
        setActiveConversationId(null);
        setMessages([starterMessage]);
      }
      toast.success("Conversation deleted");
    } catch (err) {
      console.error("Error deleting conversation:", err);
      toast.error("Could not delete conversation");
    }
  };

  // Clear current conversation messages
  const handleClearChat = async () => {
    if (!activeConversationId) {
      setMessages([starterMessage]);
      return;
    }

    try {
      await ConversationService.clearConversationMessages(activeConversationId);
      setMessages([starterMessage]);
      setShowOptionsMenu(false);
      toast.success("Chat cleared");
    } catch (err) {
      console.error("Error clearing chat:", err);
      toast.error("Could not clear chat");
    }
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    pushMessage(userMessage);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      // Create conversation if none exists
      let convoId = activeConversationId;
      if (!convoId) {
        const newConvo = await ConversationService.createConversation(
          content.length > 50 ? content.substring(0, 47) + "..." : content,
          activePetId
        );
        if (newConvo) {
          convoId = newConvo.id;
          setActiveConversationId(newConvo.id);
          setConversations((prev) => [newConvo, ...prev]);
        }
      }

      // Add user message to conversation
      if (convoId) {
        await ConversationService.addMessageToConversation(convoId, "user", content, activePetId);
      }

      // Get AI response
      const response = await AssistantService.sendMessage(content, activePetId);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.message,
      };
      pushMessage(assistantMsg);

      // Add assistant message to conversation
      if (convoId) {
        await ConversationService.addMessageToConversation(convoId, "assistant", response.message, activePetId);
      }

      // Refresh conversations to update titles/counts
      loadConversations();
    } catch (err) {
      console.error("Assistant send error", err);
      setError("Assistant is unavailable right now. Please try again.");
      toast.error("Assistant unavailable. Check network/auth and try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const quickFill = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
    handleSend(text);
  };

  // Get active conversation title
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeTitle = activeConversation?.title || "New Chat";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="rad-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            ref={panelRef}
            key="rad-panel"
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onOpenChange(false);
              }
            }}
            style={{ y: springY }}
            className={`fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-[420px] overflow-hidden rounded-[24px] border border-white/50 bg-gradient-to-b from-white via-slate-50/98 to-white shadow-[0_25px_60px_-12px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:bottom-4 sm:left-auto sm:right-4 sm:w-[400px] sm:rounded-[28px] ${isDragging ? 'cursor-grabbing' : ''}`}
          >
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-2 pb-0 cursor-grab active:cursor-grabbing">
              <div className="h-1 w-10 rounded-full bg-slate-200/80" />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-indigo-50/50" />
              <div className="relative flex items-center gap-2">
                {/* Conversation list toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConversationList(!showConversationList)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Toggle conversations"
                >
                  {showConversationList ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </motion.button>

                <motion.span
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 sm:h-10 sm:w-10"
                >
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate max-w-[140px]" title={activeTitle}>
                    {showConversationList ? "Chats" : activeTitle}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-medium text-slate-500">Dr. Radiant</p>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center gap-2">
                {/* New chat button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNewConversation}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="New conversation"
                  title="New Chat"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>

                {/* Options menu */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
                    aria-label="Options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </motion.button>

                  <AnimatePresence>
                    {showOptionsMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden"
                      >
                        <button
                          onClick={handleClearChat}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear chat
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onOpenChange(false)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label="Close assistant"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Conversation List Sidebar */}
            <AnimatePresence>
              {showConversationList && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="absolute inset-x-0 top-[72px] bottom-0 z-10 bg-white/95 backdrop-blur-xl"
                >
                  <ScrollArea className="h-full">
                    <div className="p-3 space-y-1">
                      {loadingConversations ? (
                        <div className="text-center py-8 text-slate-400 text-sm">Loading chats...</div>
                      ) : conversations.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-slate-400 text-sm mb-3">No conversations yet</p>
                          <button
                            onClick={handleNewConversation}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-xl transition-shadow"
                          >
                            <Plus className="h-4 w-4" />
                            Start a chat
                          </button>
                        </div>
                      ) : (
                        conversations.map((convo) => (
                          <motion.div
                            key={convo.id}
                            whileHover={{ scale: 1.01 }}
                            onClick={() => handleSelectConversation(convo)}
                            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                              activeConversationId === convo.id
                                ? "bg-blue-50 border border-blue-200"
                                : "hover:bg-slate-50 border border-transparent"
                            }`}
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600">
                              <MessageCircle className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{convo.title}</p>
                              <p className="text-[10px] text-slate-400">
                                {convo.messageCount} messages
                              </p>
                            </div>
                            <button
                              onClick={(e) => handleDeleteConversation(convo.id, e)}
                              className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              aria-label="Delete conversation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <ScrollArea className="h-64 sm:h-80" ref={scrollRef}>
              <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}
                {loadingHistory && (
                  <div className="text-xs text-slate-500">Loading conversation...</div>
                )}
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 15, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, x: message.role === "user" ? 20 : -20 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        delay: index === messages.length - 1 ? 0.05 : 0,
                      }}
                      className={
                        message.role === "user"
                          ? "ml-auto max-w-[85%]"
                          : "max-w-[90%]"
                      }
                    >
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={
                          message.role === "user"
                            ? "rounded-2xl rounded-br-md bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-3 text-[14px] text-white shadow-lg shadow-blue-500/20 transition-shadow hover:shadow-xl hover:shadow-blue-500/30"
                            : "rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 text-[14px] text-slate-700 shadow-md transition-shadow hover:shadow-lg"
                        }
                      >
                        {message.role === "assistant" && (
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dr. Radiant</span>
                          </div>
                        )}
                        {message.content}
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="max-w-[90%]"
                    >
                      <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 shadow-md">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-slate-100 bg-gradient-to-t from-slate-50/80 to-white px-4 py-3 sm:px-5 sm:py-4">
              <motion.div
                className={`flex items-center gap-2 rounded-xl border-2 bg-white px-3 py-1 transition-all duration-200 sm:gap-3 sm:rounded-2xl sm:py-1.5 ${
                  isFocused
                    ? "border-blue-400 shadow-lg shadow-blue-500/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <MessageCircle className={`h-4 w-4 flex-shrink-0 transition-colors sm:h-5 sm:w-5 ${isFocused ? "text-blue-500" : "text-slate-400"}`} />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Ask about your pets..."
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 sm:h-9 sm:w-9 sm:rounded-xl ${
                    input.trim()
                      ? "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </motion.button>
              </motion.div>

              {/* Quick Actions */}
              <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
                {[
                  { label: "Health review", value: "Review my pet's current health status and any concerns" },
                  { label: "Vet visit prep", value: "What should I discuss at my pet's next vet appointment?" },
                  { label: "Diet advice", value: "Is my pet at a healthy weight? Any diet recommendations?" },
                ].map((action) => (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => quickFill(action.value)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    {action.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
