import React, { useState, useRef, useEffect } from 'react';

const ChatPanel = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [expandedMessages, setExpandedMessages] = useState({});
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Add welcome message on component mount
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Welcome to the Washington DC Area Maritime Intelligence System. I can provide detailed information about:

• Vessels currently navigating the eastern seaboard with focus on those approaching the DC area
• Port operations in the Washington DC region, Baltimore, and Alexandria
• Maritime security concerns and anomalies in the Chesapeake Bay and Potomac River
• Historical context of maritime activities in the nation's capital region
• Strategic significance of waterways near Washington DC

How can I assist with your maritime intelligence needs today?`
      }
    ]);
  }, []);
  
  // Toggle message expansion
  const toggleMessageExpansion = (id) => {
    setExpandedMessages(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5050/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input })
      });
      
      const data = await response.json();
      
      // Check if response requires expansion option (if longer than 1000 characters)
      const needsExpansion = data.reply.length > 1000;
      const messageId = Date.now().toString();
      
      // Add bot message
      setMessages(prev => [
        ...prev, 
        {
          role: 'assistant',
          content: data.reply,
          timestamp: data.timestamp,
          id: messageId,
          needsExpansion
        }
      ]);
      
      // If the message is very long, default to collapsed state
      if (needsExpansion) {
        setExpandedMessages(prev => ({
          ...prev,
          [messageId]: false // Collapsed by default
        }));
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          error: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to determine how to display message content
  const getDisplayContent = (message) => {
    if (!message.needsExpansion || expandedMessages[message.id]) {
      return message.content;
    }
    
    // Show first ~600 characters with ellipsis if collapsed
    return message.content.substring(0, 600) + '...';
  };

  // Prepare a set of detailed maritime queries to help users
  const suggestedQueries = [
    "What vessels are currently approaching the Washington DC area?",
    "Tell me about the historical significance of the Port of Baltimore",
    "What maritime security measures are in place around DC's waterways?",
    "Analyze vessel traffic patterns in the Chesapeake Bay",
    "Explain the strategic importance of Alexandria's port facilities",
    "What are the current anomalies detected in the DC maritime area?"
  ];
  
  // Suggest a random query from the list
  const getRandomSuggestion = () => {
    const randomIndex = Math.floor(Math.random() * suggestedQueries.length);
    return suggestedQueries[randomIndex];
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4 space-y-4 mb-4 border border-border rounded-md bg-backgroundAlt">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${
              message.role === 'user' ? 'text-right' : ''
            }`}
          >
            <div
              className={`inline-block max-w-[90%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-accentBlue text-white rounded-tr-none'
                  : message.error
                  ? 'bg-alertRed bg-opacity-10 text-alertRed rounded-tl-none'
                  : 'bg-card border border-border rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {getDisplayContent(message)}
              </div>
              
              {message.needsExpansion && (
                <button
                  onClick={() => toggleMessageExpansion(message.id)}
                  className="text-xs mt-2 text-accentBlue hover:underline"
                >
                  {expandedMessages[message.id] ? 'Show Less' : 'Read Full Response'}
                </button>
              )}
              
              {message.timestamp && (
                <div className="text-xs text-textSecondary mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-border rounded-full animate-pulse mr-1"></div>
            <div className="w-2 h-2 bg-border rounded-full animate-pulse mr-1" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-border rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
      </div>
      
      {/* Message entry */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Try: "${getRandomSuggestion()}"`}
          className="flex-grow p-2 border border-border rounded-md bg-background text-text"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-accentBlue text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
      
      {/* Query suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button 
          onClick={() => setInput("Tell me about vessels near DC")}
          className="text-xs bg-backgroundAlt hover:bg-border px-3 py-1 rounded-full text-textSecondary"
        >
          DC Vessels
        </button>
        <button 
          onClick={() => setInput("Analyze Port of Baltimore operations")}
          className="text-xs bg-backgroundAlt hover:bg-border px-3 py-1 rounded-full text-textSecondary"
        >
          Baltimore Port
        </button>
        <button 
          onClick={() => setInput("Potomac River maritime security")}
          className="text-xs bg-backgroundAlt hover:bg-border px-3 py-1 rounded-full text-textSecondary"
        >
          Potomac Security
        </button>
        <button 
          onClick={() => setInput("Eastern seaboard vessel trends")}
          className="text-xs bg-backgroundAlt hover:bg-border px-3 py-1 rounded-full text-textSecondary"
        >
          Seaboard Trends
        </button>
      </div>
    </div>
  );
};

export default ChatPanel; 