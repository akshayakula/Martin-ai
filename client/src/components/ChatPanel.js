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
  const [availableEndpoints, setAvailableEndpoints] = useState({});
  const messagesEndRef = useRef(null);
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Fetch available endpoints on component mount
  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const response = await fetch('http://localhost:5050/api/agent/endpoints');
        if (response.ok) {
          const data = await response.json();
          setAvailableEndpoints(data.endpoints || {});
        }
      } catch (error) {
        console.error('Error fetching endpoints:', error);
      }
    };
    
    fetchEndpoints();
  }, []);
  
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
    
    try {
      // Call the backend API
      const response = await fetch('http://localhost:5050/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: inputText })
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add agent response to chat
      const agentResponse = {
        sender: 'agent',
        text: data.reply,
        timestamp: new Date(data.timestamp) || new Date(),
        functionCalled: data.functionCalled,
        isComplexQuery: data.isComplexQuery,
        usingFallback: data.usingFallback
      };
      
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
  
  // Get a description for the API endpoint
  const getEndpointDescription = (endpoint) => {
    if (!endpoint) return null;
    
    // For complex queries that use multiple endpoints
    if (endpoint.includes(',')) {
      return 'Multiple endpoints used to answer your question';
    }
    
    // Remove any "get" prefix from function name to match endpoint key
    const endpointKey = endpoint.replace(/^get/, '').toLowerCase();
    
    // Map function names to endpoint descriptions
    const functionToEndpointMap = {
      'getAllVessels': 'vessel_list',
      'getUSVessels': 'vessel_list',
      'trackVesselByMMSI': 'vessel_pro',
      'getVesselByIMO': 'vessel_info',
      'getVesselsInArea': 'vessel_inarea',
      'searchVesselsByName': 'vessel_search',
      'getVesselHistory': 'vessel_history',
      'getPortInfo': 'port_info',
      'getVesselsInPort': 'port_vessels',
      'getAnomalies': 'anomalies'
    };
    
    const mappedEndpoint = functionToEndpointMap[endpoint];
    
    return mappedEndpoint && availableEndpoints[mappedEndpoint] 
      ? availableEndpoints[mappedEndpoint] 
      : `Using ${endpoint}`;
  };
  
  // Function to add sample queries
  const addSampleQuery = (query) => {
    setInputText(query);
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
              
              {/* Show endpoint info if available */}
              {msg.sender === 'agent' && msg.functionCalled && !msg.isError && (
                <div className="mt-2 text-xs bg-accentPurple bg-opacity-10 p-1 rounded">
                  <span className="text-accentPurple font-medium">
                    {msg.isComplexQuery ? 'Multi-API: ' : 'API: '}
                  </span>
                  <span>{getEndpointDescription(msg.functionCalled)}</span>
                </div>
              )}
              
              {/* Show fallback info if using fallback */}
              {msg.sender === 'agent' && msg.usingFallback && (
                <div className="mt-2 text-xs bg-accentBlue bg-opacity-10 p-1 rounded">
                  <span className="text-accentBlue font-medium">Using standard response</span>
                </div>
              )}
              
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
        
        {/* Example queries */}
        <div className="mt-4 mb-2">
          <p className="text-xs text-text opacity-70 mb-2">Try these example queries:</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => addSampleQuery('List all vessels near San Francisco')}
            className="text-xs bg-accentPurple bg-opacity-20 text-accentPurple px-2 py-1 rounded-md"
          >
            Vessels near San Francisco
          </button>
          <button
            onClick={() => addSampleQuery('Track vessel with MMSI 366962000')}
            className="text-xs bg-accentBlue bg-opacity-20 text-accentBlue px-2 py-1 rounded-md"
          >
            Track specific vessel
          </button>
          <button
            onClick={() => addSampleQuery('What vessels are in Singapore port?')}
            className="text-xs bg-accentCyan bg-opacity-20 text-accentCyan px-2 py-1 rounded-md"
          >
            Vessels in port
          </button>
          <button
            onClick={() => addSampleQuery('Search for vessel named MAERSK')}
            className="text-xs bg-text bg-opacity-20 text-text px-2 py-1 rounded-md"
          >
            Search by name
          </button>
          <button
            onClick={() => addSampleQuery('Show me vessel history for MMSI 366962000')}
            className="text-xs bg-accentGreen bg-opacity-20 text-accentGreen px-2 py-1 rounded-md"
          >
            Vessel history
          </button>
          <button
            onClick={() => addSampleQuery('Which vessels turned off AIS recently?')}
            className="text-xs bg-alertRed bg-opacity-20 text-alertRed px-2 py-1 rounded-md"
          >
            AIS shutoffs
          </button>
          <button
            onClick={() => addSampleQuery('Compare vessels in Singapore and Hong Kong ports')}
            className="text-xs bg-accentYellow bg-opacity-20 text-accentYellow px-2 py-1 rounded-md"
          >
            Compare ports
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel; 