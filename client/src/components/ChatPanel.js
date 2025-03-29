import React, { useState, useRef, useEffect } from 'react';

const ChatPanel = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'agent',
      text: 'Hello, I am MartinAI. I can provide information about vessels in the monitored zone. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // In a real app, this would call the backend API
    try {
      // Mock API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For the MVP, we'll use mock responses
      let agentResponse;
      
      if (inputText.toLowerCase().includes('vessel')) {
        agentResponse = {
          sender: 'agent',
          text: 'I\'m currently tracking 3 vessels in the monitored zone. One vessel (MMSI: 123456789) is showing a route deviation of 3.4 nautical miles.',
          timestamp: new Date()
        };
      } else if (inputText.toLowerCase().includes('anomal') || inputText.toLowerCase().includes('deviation')) {
        agentResponse = {
          sender: 'agent',
          text: 'I\'ve detected 1 route deviation and 1 AIS signal loss in the monitored zone. The route deviation is from vessel MMSI 123456789, currently 3.4nm off expected route. The AIS shutoff was detected from vessel MMSI 456123789, last seen 15 minutes ago.',
          timestamp: new Date()
        };
      } else if (inputText.toLowerCase().includes('ais') || inputText.toLowerCase().includes('shutoff')) {
        agentResponse = {
          sender: 'agent',
          text: 'One vessel (MMSI: 456123789) has stopped transmitting AIS signals. It was last seen 15 minutes ago near coordinates 38.88N, 77.04W.',
          timestamp: new Date()
        };
      } else {
        agentResponse = {
          sender: 'agent',
          text: 'The maritime zone is currently being monitored. There are 3 vessels in the zone, with 1 route deviation and 1 AIS signal loss detected. I can provide more details if needed.',
          timestamp: new Date()
        };
      }
      
      setMessages(prev => [...prev, agentResponse]);
    } catch (error) {
      console.error('Error sending message to agent:', error);
      
      // Add error message
      setMessages(prev => [...prev, {
        sender: 'agent',
        text: 'I\'m sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle pressing Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.sender === 'user' 
                  ? 'bg-accentCyan text-background' 
                  : msg.isError 
                    ? 'bg-alertRed bg-opacity-20 text-alertRed' 
                    : 'bg-border bg-opacity-30'
              }`}
            >
              <p>{msg.text}</p>
              <p className="text-xs opacity-70 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-border bg-opacity-30">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-text opacity-60 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-text opacity-60 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-text opacity-60 animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask MartinAI about vessels or anomalies..."
            className="input flex-grow resize-none h-12 py-2"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="btn-primary ml-2 h-12"
          >
            Send
          </button>
        </div>
        <div className="flex flex-wrap mt-3 gap-2">
          <button
            onClick={() => setInputText('List all US vessels in zone')}
            className="text-xs bg-accentPurple bg-opacity-20 text-accentPurple px-2 py-1 rounded-md"
          >
            List vessels
          </button>
          <button
            onClick={() => setInputText('Show route deviation cases')}
            className="text-xs bg-accentBlue bg-opacity-20 text-accentBlue px-2 py-1 rounded-md"
          >
            Route deviations
          </button>
          <button
            onClick={() => setInputText('Who turned off AIS near Washington?')}
            className="text-xs bg-alertRed bg-opacity-20 text-alertRed px-2 py-1 rounded-md"
          >
            AIS shutoffs
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel; 