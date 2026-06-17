'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Zap } from 'lucide-react';

/**
 * Concierge Widget
 * Cleans up flows: Start gift board, AutoGift, AI suggestions, general help
 */

export function ConciergeWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFlow, setActiveFlow] = useState<'menu' | 'chat' | 'autogift' | 'board'>('menu');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'concierge'; text: string }>>([]);
  const [inputValue, setInputValue] = useState('');

  const handleStartChat = () => {
    setActiveFlow('chat');
    setMessages([
      {
        role: 'concierge',
        text: 'Hi there! 👋 I can help you find the perfect gift or create a gift board. What would you like to do?',
      },
    ]);
  };

  const handleStartAutoGift = () => {
    setActiveFlow('autogift');
    setMessages([
      {
        role: 'concierge',
        text: 'AutoGift makes gift-giving automatic. Set it once, and we\'ll handle reminders and fulfillment. Ready to set up?',
      },
    ]);
  };

  const handleCreateBoard = () => {
    setActiveFlow('board');
    setMessages([
      {
        role: 'concierge',
        text: 'Gift Boards let you curate and save gifts. Want to create one now? I can walk you through it.',
      },
    ]);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text: inputValue }]);

    // Simulate concierge response (in production, call API)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'concierge',
          text: 'Got it! Let me help you with that. Just a moment...',
        },
      ]);
    }, 500);

    setInputValue('');
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all duration-200 flex items-center justify-center z-30"
          aria-label="Open Concierge"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Concierge Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col max-h-96">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white rounded-t-lg">
            <div>
              <h3 className="font-semibold">Givit Concierge</h3>
              <p className="text-xs text-primary-100">Always here to help</p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setActiveFlow('menu');
              }}
              className="p-1 hover:bg-primary-700 rounded transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Menu or Chat */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeFlow === 'menu' ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-700 mb-4">What can I help you with?</p>
                <button
                  onClick={handleStartChat}
                  className="w-full flex items-center gap-3 p-3 text-left bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition"
                >
                  <Zap size={18} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Find a Gift</p>
                    <p className="text-xs text-gray-600">AI-powered suggestions</p>
                  </div>
                </button>
                <button
                  onClick={handleStartAutoGift}
                  className="w-full flex items-center gap-3 p-3 text-left bg-green-50 hover:bg-green-100 rounded border border-green-200 transition"
                >
                  <Zap size={18} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Set Up AutoGift</p>
                    <p className="text-xs text-gray-600">Automatic reminders & gifts</p>
                  </div>
                </button>
                <button
                  onClick={handleCreateBoard}
                  className="w-full flex items-center gap-3 p-3 text-left bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition"
                >
                  <Zap size={18} className="text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Create a Board</p>
                    <p className="text-xs text-gray-600">Curate and save gifts</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          {activeFlow !== 'menu' && (
            <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
