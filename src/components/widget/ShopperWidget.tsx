"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  ShoppingBag,
  ExternalLink,
  Calendar,
  Phone,
  UserCheck,
  Check,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface ProductCard {
  id: string;
  name: string;
  price: string;
  imageUrl?: string;
  url?: string;
  inStock: boolean;
  rating?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: ProductCard[];
  actions?: { label: string; action: string; targetId?: string }[];
  timestamp: string;
}

interface AvailabilityDay {
  date: string;
  slots: { start: string; end: string; staffId: string | null }[];
}

interface ShopperWidgetProps {
  businessName?: string;
  businessId?: string;
  assistantName?: string;
  primaryColor?: string;
  welcomeMessage?: string;
  position?: "bottom-right" | "bottom-left";
  isEmbedFrame?: boolean;
}

export const ShopperWidget: React.FC<ShopperWidgetProps> = ({
  businessName: initialBizName = "Store Assistant",
  businessId,
  assistantName: initialAssistantName = "Sophia",
  primaryColor: initialColor = "#4F46E5",
  welcomeMessage: initialWelcome = "Hi! I can help you find products, check stock, or answer any questions.",
  position = "bottom-right",
  isEmbedFrame = false,
}) => {
  const [businessName, setBusinessName] = useState(initialBizName);
  const [assistantName, setAssistantName] = useState(initialAssistantName);
  const [primaryColor, setPrimaryColor] = useState(initialColor);
  const [welcomeMessage, setWelcomeMessage] = useState(initialWelcome);

  const [isOpen, setIsOpen] = useState(isEmbedFrame);
  const [sessionId, setSessionId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  // Native booking state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDays, setBookingDays] = useState<AvailabilityDay[]>([]);
  const [bookingTimezone, setBookingTimezone] = useState("UTC");
  const [bookingExternalUrl, setBookingExternalUrl] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<{
    startAt: string;
    status: string;
    message: string;
  } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // 1. Initialize Persistent Session ID
  useEffect(() => {
    try {
      const storageKey = businessId
        ? `nesale_session_${businessId}`
        : "nesale_shopper_session";
      let stored = sessionStorage.getItem(storageKey);
      if (!stored) {
        stored = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        sessionStorage.setItem(storageKey, stored);
      }
      setSessionId(stored);
    } catch {
      setSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    }
  }, [businessId]);

  // 2. Fetch live tenant widget configuration if businessId is provided
  useEffect(() => {
    if (!businessId) return;
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/v1/widget/config?businessId=${encodeURIComponent(businessId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.businessName) setBusinessName(data.businessName);
        if (data.config?.assistantName) setAssistantName(data.config.assistantName);
        if (data.config?.primaryColor) setPrimaryColor(data.config.primaryColor);
        if (data.config?.welcomeMessage) {
          setWelcomeMessage(data.config.welcomeMessage);
          setMessages((prev) => {
            if (prev.length === 1 && prev[0].role === "assistant") {
              return [{ ...prev[0], text: data.config.welcomeMessage }];
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn("[ShopperWidget] Live config fetch notice:", err);
      }
    };
    fetchConfig();
  }, [businessId]);

  const trackEvent = (eventType: string, extra: Record<string, any> = {}) => {
    try {
      fetch("/api/v1/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          businessId,
          conversationId,
          ...extra,
        }),
      }).catch(() => {});
    } catch {}
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      text: initialWelcome,
      actions: [
        { label: "Best-Selling Products", action: "recommend_packs" },
        { label: "Return Policy", action: "ask_policy" },
        { label: "Talk to Human", action: "handoff" },
      ],
      timestamp: "Just now",
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    try {
      const activeSession =
        sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const res = await fetch("/api/v1/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          business_id: businessId,
          session_id: activeSession,
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Chat service unavailable");
      }

      const isStream = res.headers.get("content-type")?.includes("text/event-stream") && res.body;

      if (isStream) {
        const replyId = (Date.now() + 1).toString();
        let assistantText = "";
        let streamProducts: ProductCard[] = [];
        let streamActions: any[] = [];
        let messageAdded = false;

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() ?? "";

          let currentEvent = "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("event: ")) {
              currentEvent = trimmed.slice(7);
            } else if (trimmed.startsWith("data: ")) {
              const rawData = trimmed.slice(6);
              try {
                const payload = JSON.parse(rawData);

                if (currentEvent === "meta") {
                  setIsTyping(false);
                  if (payload.session_id) {
                    setSessionId(payload.session_id);
                  }
                  if (payload.products) {
                    streamProducts = payload.products.map((p: any) => ({
                      id: p.id || String(Math.random()),
                      name: p.name,
                      price: typeof p.price === "number" ? `${p.price.toFixed(2)}` : p.price || "$49.99",
                      imageUrl: p.imageUrl || p.image_url,
                      url: p.url,
                      inStock: p.available ?? p.inStock ?? true,
                      rating: p.rating || "4.8 ★",
                    }));
                  }
                  if (!messageAdded) {
                    messageAdded = true;
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: replyId,
                        role: "assistant",
                        text: "",
                        products: streamProducts,
                        timestamp: "Just now",
                      },
                    ]);
                  }
                } else if (currentEvent === "token") {
                  setIsTyping(false);
                  assistantText += payload.token || "";
                  if (!messageAdded) {
                    messageAdded = true;
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: replyId,
                        role: "assistant",
                        text: assistantText,
                        products: streamProducts,
                        timestamp: "Just now",
                      },
                    ]);
                  } else {
                    setMessages((prev) =>
                      prev.map((m) => (m.id === replyId ? { ...m, text: assistantText } : m))
                    );
                  }
                } else if (currentEvent === "done") {
                  if (payload.needsHandoff) {
                    setLeadFormOpen(true);
                  }
                  if (payload.actions) {
                    streamActions = payload.actions.map((a: any) => ({
                      label: a.label,
                      action: a.type || a.action,
                      targetId: a.target_id || a.targetId,
                    }));
                  }
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === replyId
                        ? { ...m, text: payload.answer || assistantText, actions: streamActions }
                        : m
                    )
                  );
                }
              } catch {}
            }
          }
        }
        setIsTyping(false);
      } else {
        const data = await res.json();
        setIsTyping(false);

        if (data.session_id) {
          setSessionId(data.session_id);
          try {
            const storageKey = businessId
              ? `nesale_session_${businessId}`
              : "nesale_shopper_session";
            sessionStorage.setItem(storageKey, data.session_id);
          } catch {}
        }

        if (data.conversation_id) {
          setConversationId(data.conversation_id);
        }

        if (data.needs_handoff) {
          setLeadFormOpen(true);
        }

        const reply: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: data.message?.text || "I'm here to help!",
          products: data.products?.map((p: any) => ({
            id: p.id || String(Math.random()),
            name: p.name,
            price: typeof p.price === "number" ? `${p.price.toFixed(2)}` : p.price || "$49.99",
            imageUrl: p.imageUrl || p.image_url,
            url: p.url,
            inStock: p.available ?? p.inStock ?? true,
            rating: p.rating || "4.8 ★",
          })),
          actions: data.actions?.map((a: any) => ({
            label: a.label,
            action: a.type || a.action,
            targetId: a.target_id || a.targetId,
          })),
          timestamp: "Just now",
        };

        setMessages((prev) => [...prev, reply]);
      }
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "I'm having a brief connection delay, but I'm still right here. Please try asking again!",
          timestamp: "Just now",
        },
      ]);
    }
  };

  const openBooking = async (targetId?: string) => {
    const target = targetId || "";
    if (/^https?:\/\//i.test(target)) {
      trackEvent("booking_opened", { target });
      window.open(target, "_blank");
      return;
    }

    setBookingOpen(true);
    setBookingConfirmed(null);
    setBookingError(null);
    setBookingSlot(null);
    setBookingServiceId(target || null);
    setBookingLoading(true);
    trackEvent("booking_opened", { serviceId: target || null });

    try {
      const params = new URLSearchParams({ days: "14" });
      if (businessId) params.set("business_id", businessId);
      if (target) params.set("service_id", target);
      const res = await fetch(`/api/v1/widget/availability?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Availability unavailable");

      const days: AvailabilityDay[] = Array.isArray(data.days) ? data.days : [];
      setBookingDays(days);
      setBookingTimezone(data.timezone || "UTC");
      setBookingExternalUrl(data.bookingUrl || null);
      const firstOpen = days.find((day) => day.slots.length > 0);
      setBookingDate(firstOpen?.date || days[0]?.date || "");
    } catch (err: any) {
      setBookingError(err?.message || "Could not load available times.");
    } finally {
      setBookingLoading(false);
    }
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlot) {
      setBookingError("Please pick a time.");
      return;
    }
    if (!bookingName.trim()) {
      setBookingError("Please enter your name.");
      return;
    }
    if (!bookingEmail.trim() && !bookingPhone.trim()) {
      setBookingError("Please add an email or phone number.");
      return;
    }

    setBookingSubmitting(true);
    setBookingError(null);
    try {
      const res = await fetch("/api/v1/widget/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          service_id: bookingServiceId,
          startAt: bookingSlot,
          customer_name: bookingName,
          customer_email: bookingEmail || null,
          customer_phone: bookingPhone || null,
          conversation_id: conversationId,
          source: "widget",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Could not book this time");

      setBookingConfirmed({
        startAt: data.appointment?.startAt || bookingSlot,
        status: data.appointment?.status || "pending",
        message: data.message || "Your appointment request has been received.",
      });
      trackEvent("appointment_booked", {
        serviceId: bookingServiceId,
        startAt: bookingSlot,
        status: data.appointment?.status,
      });
    } catch (err: any) {
      setBookingError(err?.message || "Could not book this time.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleActionClick = (act: { label: string; action: string; targetId?: string }) => {
    if (act.action === "open_booking") {
      openBooking(act.targetId);
    } else if (
      act.action === "handoff" ||
      act.action === "handoff_to_human" ||
      act.action === "talk_to_human" ||
      act.action === "lead_capture" ||
      act.action === "capture_lead"
    ) {
      setLeadFormOpen(true);
      trackEvent("handoff_requested", { reason: act.label });
    } else if (act.action === "open_whatsapp" || act.action === "call_business") {
      if (act.targetId && /^https?:|^tel:|^https:\/\/wa\.me/i.test(act.targetId)) {
        window.open(act.targetId, "_blank");
      } else {
        setLeadFormOpen(true);
      }
    } else if (act.action === "checkout") {
      trackEvent("checkout_click");
      if (typeof window !== "undefined") {
        window.open("/checkout", "_blank");
      }
    } else {
      handleSend(act.label);
    }
  };

  const handleAddToCart = (product: ProductCard) => {
    setAddedItems((prev) => ({ ...prev, [product.id]: true }));
    const numericPrice =
      typeof product.price === "number"
        ? product.price
        : parseFloat(String(product.price).replace(/[^0-9.]/g, "") || "0");

    trackEvent("add_to_cart", {
      entityType: "product",
      entityId: product.id,
      valueNumeric: numericPrice,
      metadata: { name: product.name, price: product.price },
    });

    const confirmation: Message = {
      id: Date.now().toString(),
      role: "assistant",
      text: `Added "${product.name}" to your shopping cart! Would you like to proceed to checkout?`,
      actions: [{ label: "Proceed to Checkout →", action: "checkout" }],
      timestamp: "Just now",
    };
    setTimeout(() => {
      setMessages((prev) => [...prev, confirmation]);
    }, 300);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail.trim()) return;

    setLeadSubmitted(true);
    setLeadFormOpen(false);

    try {
      await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          email: leadEmail,
          name: leadName,
          conversationId,
          source: "widget_chat",
        }),
      });

      trackEvent("lead_captured", {
        email: leadEmail,
        name: leadName,
      });
    } catch {
      // Graceful fallback
    }

    const thanksMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      text: `Thank you ${leadName || "there"}! We've forwarded your request to our team at ${businessName}. A sales specialist will follow up shortly at ${leadEmail}.`,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, thanksMsg]);
  };

  const handleClose = () => {
    if (isEmbedFrame) {
      if (typeof window !== "undefined") {
        window.parent?.postMessage({ type: "nesale_close_widget" }, "*");
      }
    } else {
      setIsOpen(false);
    }
  };

  // Content of Chat Window
  const formatSlotTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatBookingDay = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const openBookingDays = bookingDays.filter((day) => day.slots.length > 0);
  const selectedDay = bookingDays.find((day) => day.date === bookingDate);

  const chatWindowContent = (
    <div
      className={`${
        isEmbedFrame
          ? "w-full h-full rounded-2xl sm:rounded-3xl"
          : "w-[calc(100vw-2rem)] sm:w-96 max-h-[85dvh] sm:max-h-[82vh] h-[580px] rounded-3xl"
      } bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200`}
    >
      {/* Widget Top Header */}
      <div
        className="px-4 py-3.5 text-white flex items-center justify-between shrink-0"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              {assistantName[0] || "S"}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-[#11141d] rounded-full"></span>
          </div>
          <div>
            <h3 className="text-xs font-bold leading-tight flex items-center gap-1">
              <span>{assistantName}</span>
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
            </h3>
            <p className="text-[10px] text-white/80 leading-tight mt-0.5">
              AI Sales Assistant • {businessName}
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/90 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.99]"
          aria-label="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conversation Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-[#0c0e15] text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`py-2.5 px-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                msg.role === "user"
                  ? "text-white rounded-tr-xs"
                  : "bg-white dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-100 rounded-tl-xs shadow-xs"
              }`}
              style={
                msg.role === "user" ? { backgroundColor: primaryColor } : {}
              }
            >
              {msg.text}
            </div>

            {/* Product Recommendation Cards inside chat */}
            {msg.products && (
              <div className="mt-2 space-y-2 w-full max-w-[90%]">
                {msg.products.map((p) => {
                  const isAdded = addedItems[p.id];
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        trackEvent("product_click", {
                          entityType: "product",
                          entityId: p.id,
                          metadata: { name: p.name, price: p.price },
                        });
                        if (p.url) {
                          window.open(p.url, "_blank");
                        }
                      }}
                      className="bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-500/50 transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate block max-w-[160px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-amber-500 font-semibold shrink-0">
                          {p.rating}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {p.price}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(p);
                          }}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition active:scale-[0.99] cursor-pointer min-h-[40px] ${
                            isAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300"
                          }`}
                        >
                          {isAdded ? "Added ✓" : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Chip Buttons */}
            {msg.actions && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {msg.actions.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleActionClick(act)}
                    className="px-3.5 py-2 rounded-full bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[38px] flex items-center justify-center"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}

            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] py-2 px-3 rounded-2xl rounded-tl-xs w-16 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
          </div>
        )}

        {/* Native Booking Panel */}
        {bookingOpen && (
          <div className="bg-white dark:bg-[#171b26] border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Book an appointment</span>
              </div>
              <button
                onClick={() => {
                  setBookingOpen(false);
                  setBookingConfirmed(null);
                  setBookingError(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 cursor-pointer"
                aria-label="Close booking"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {bookingConfirmed ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                  <Check className="w-4 h-4" />
                  <span>
                    {bookingConfirmed.status === "confirmed"
                      ? "Appointment confirmed"
                      : "Appointment requested"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {new Date(bookingConfirmed.startAt).toLocaleString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {bookingConfirmed.message}
                </p>
              </div>
            ) : bookingLoading ? (
              <p className="text-[11px] text-slate-500">Checking available times...</p>
            ) : bookingError && openBookingDays.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{bookingError}</p>
                {bookingExternalUrl && (
                  <button
                    onClick={() => window.open(bookingExternalUrl, "_blank")}
                    className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/[0.10] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Book on our website
                  </button>
                )}
              </div>
            ) : openBookingDays.length === 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  No online times are available right now. Leave your details and the team will
                  contact you to schedule.
                </p>
                {bookingExternalUrl && (
                  <button
                    onClick={() => window.open(bookingExternalUrl, "_blank")}
                    className="w-full py-2 rounded-lg border border-slate-200 dark:border-white/[0.10] text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Book on our website
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={submitBooking} className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Choose a day
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {openBookingDays.map((day) => (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => {
                          setBookingDate(day.date);
                          setBookingSlot(null);
                          setBookingError(null);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap border transition cursor-pointer ${
                          bookingDate === day.date
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-slate-200 dark:border-white/[0.10] text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {formatBookingDay(day.date)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Choose a time
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                    {(selectedDay?.slots || []).map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => {
                          setBookingSlot(slot.start);
                          setBookingError(null);
                        }}
                        className={`px-2 py-2 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                          bookingSlot === slot.start
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-slate-200 dark:border-white/[0.10] text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {formatSlotTime(slot.start)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <input
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    type="email"
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <input
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    placeholder="Phone number (optional if email given)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {bookingError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">{bookingError}</p>
                )}

                <button
                  type="submit"
                  disabled={bookingSubmitting || !bookingSlot}
                  className="w-full py-2.5 rounded-lg text-white font-semibold text-xs transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {bookingSubmitting ? "Booking..." : "Confirm appointment"}
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  Times shown in {bookingTimezone}
                </p>
              </form>
            )}
          </div>
        )}

        {/* Lead Capture Modal / Sheet */}
        {leadFormOpen && !leadSubmitted && (
          <div className="bg-white dark:bg-[#171b26] border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 shadow-sm space-y-2.5 animate-in fade-in">
            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Request Human Callback</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Leave your details and a product specialist will get in touch.
            </p>
            <form onSubmit={handleLeadSubmit} className="space-y-2">
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                type="email"
                required
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-[0.99] cursor-pointer min-h-[44px]"
              >
                Submit Request
              </button>
            </form>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Chat Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white dark:bg-[#11141d] border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about products, sizing, or stock..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/[0.10] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition min-h-[44px]"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-2.5 rounded-xl text-white disabled:opacity-40 transition active:scale-[0.99] cursor-pointer shadow-sm flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px]"
          style={{ backgroundColor: primaryColor }}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Safe Brand Footer */}
      <div className="py-2 px-3 bg-slate-50 dark:bg-[#090a0f] border-t border-slate-100 dark:border-white/[0.08] text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Grounded Catalog
        </span>
        <span>Powered by NESale</span>
      </div>
    </div>
  );

  // If in embed frame mode, return full container directly
  if (isEmbedFrame) {
    return (
      <div className="w-full h-full font-sans bg-transparent flex flex-col overflow-hidden">
        {chatWindowContent}
      </div>
    );
  }

  const posClasses =
    position === "bottom-left"
      ? "left-4 sm:left-6"
      : "right-4 sm:right-6";

  return (
    <div className={`fixed bottom-4 sm:bottom-6 z-50 ${posClasses} font-sans`}>
      {/* 1. Floating Launcher Button */}
      {!isOpen && (
        <div className="relative group">
          {/* Greeting Bubble Badge when collapsed */}
          {hasUnread && (
            <div className="absolute -top-12 right-0 bg-white dark:bg-[#11141d] border border-slate-200/90 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-semibold py-1.5 px-3 rounded-2xl shadow-md whitespace-nowrap animate-bounce flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Need help finding anything?</span>
            </div>
          )}

          <button
            onClick={() => {
              setIsOpen(true);
              trackEvent("widget_open");
            }}
            className="w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-all duration-200 active:scale-[0.99] hover:shadow-2xl cursor-pointer min-h-[44px] min-w-[44px]"
            style={{ backgroundColor: primaryColor }}
            aria-label="Open chat assistant"
          >
            <MessageSquare className="w-6 h-6" />
            {hasUnread && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#11141d] rounded-full"></span>
            )}
          </button>
        </div>
      )}

      {/* 2. Interactive Chat Drawer / Popover Window */}
      {isOpen && chatWindowContent}
    </div>
  );
};
