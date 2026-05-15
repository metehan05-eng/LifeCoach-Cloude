"use client";
import React, { useState, useRef, useEffect } from 'react';
import HanCodeIDEViewer from './HanCodeIDEViewer';
import styles from './HanCodeStudio.module.css';

export default function HanCodeStudio({ user }) {
  const [projectType, setProjectType] = useState(null); // 'mobile' | 'web' | 'desktop' | 'backend' | 'game'
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'chat' | 'preview'
  const inputRef = useRef(null);

  const projectTypeConfig = {
    mobile: { icon: '📱', label: 'Mobile App', color: '#3B82F6', description: 'React Native / Flutter' },
    web: { icon: '🌐', label: 'Web Site', color: '#10B981', description: 'React / Next.js / Vue' },
    desktop: { icon: '🖥️', label: 'Desktop App', color: '#F59E0B', description: 'Electron / Tauri' },
    backend: { icon: '⚙️', label: 'Backend API', color: '#8B5CF6', description: 'Node.js / Python' },
    game: { icon: '🎮', label: 'Game', color: '#EF4444', description: 'Phaser / Three.js' },
  };

  const handleProjectSelect = (type) => {
    setProjectType(type);
    setActiveTab('chat');
  };

  const handleGenerateProject = async () => {
    if (!projectName.trim() || !projectDescription.trim()) {
      alert('Please fill in project name and description');
      return;
    }

    setIsGenerating(true);
    const userMessage = {
      role: 'user',
      content: `Create a ${projectType} project called "${projectName}". Description: ${projectDescription}\n\nGenerate complete, production-ready code with proper folder structure, all dependencies, and setup instructions.`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/hancode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          email: user?.email,
          projectType,
          mode: 'create',
          history: messages.filter(m => m.role !== 'system'),
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate project');
      }

      const data = await response.json();
      const aiResponse = {
        role: 'assistant',
        content: data.response || data.message || data.reply || 'Project generated successfully!',
        timestamp: new Date(),
        model: data.model || data.usedModel || 'qwen'
      };

      setMessages(prev => [...prev, aiResponse]);
      setGeneratedCode(aiResponse.content);
      setActiveTab('preview');
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/hancode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          email: user?.email,
          projectType,
          mode: 'create',
          history: messages.filter(m => m.role !== 'system'),
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const aiResponse = {
        role: 'assistant',
        content: data.response || data.message || data.reply,
        timestamp: new Date(),
        model: data.model || data.usedModel || 'qwen'
      };

      setMessages(prev => [...prev, aiResponse]);
      setGeneratedCode(data.response || data.message || data.reply);
    } catch (error) {
      console.error('Message error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span style={{ fontSize: '24px', marginRight: '12px' }}>⚔️</span>
            <div>
              <h1>HAN Code</h1>
              <p>AI-Powered Code Generator</p>
            </div>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || 'Developer'}</span>
            <span className={styles.badge}>Qwen Powered</span>
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        {/* Sidebar - Tab Navigation */}
        <aside className={styles.sidebar}>
          <div className={styles.tabButtons}>
            {!projectType ? (
              <div className={styles.tabButton} style={{ opacity: 0.7 }}>
                Select a project type
              </div>
            ) : (
              <>
                <button
                  className={`${styles.tabButton} ${activeTab === 'setup' ? styles.active : ''}`}
                  onClick={() => setActiveTab('setup')}
                >
                  <span>⚙️</span> Setup
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === 'chat' ? styles.active : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  <span>💬</span> Chat
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === 'preview' ? styles.active : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <span>👁️</span> Preview
                </button>
              </>
            )}
          </div>

          {projectType && (
            <div className={styles.projectInfo}>
              <div style={{ opacity: 0.7, marginBottom: '8px' }}>Current Project</div>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                {projectTypeConfig[projectType]?.icon}
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {projectTypeConfig[projectType]?.label}
              </div>
              <div style={{ opacity: 0.6, fontSize: '12px' }}>
                {projectName || 'Unnamed'}
              </div>
              <button
                className={styles.changeTypeBtn}
                onClick={() => {
                  setProjectType(null);
                  setProjectName('');
                  setProjectDescription('');
                  setActiveTab('setup');
                }}
              >
                Change Type
              </button>
            </div>
          )}
        </aside>

        {/* Main Area */}
        <main className={styles.main}>
          {activeTab === 'setup' && !projectType ? (
            <div className={styles.setupGrid}>
              <h2 style={{ gridColumn: '1 / -1', marginBottom: '32px', textAlign: 'center' }}>
                Choose Your Project Type
              </h2>
              {Object.entries(projectTypeConfig).map(([key, config]) => (
                <div
                  key={key}
                  className={styles.projectCard}
                  onClick={() => handleProjectSelect(key)}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                    {config.icon}
                  </div>
                  <h3>{config.label}</h3>
                  <p>{config.description}</p>
                  <div className={styles.cardArrow}>→</div>
                </div>
              ))}
            </div>
          ) : activeTab === 'setup' ? (
            <div className={styles.setupForm}>
              <h2>Project Details</h2>
              <div className={styles.formGroup}>
                <label>Project Name</label>
                <input
                  type="text"
                  placeholder="e.g., TaskMaster App"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  placeholder="Describe what your app should do..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className={styles.textarea}
                  rows="5"
                />
              </div>
              <button
                className={styles.generateBtn}
                onClick={handleGenerateProject}
                disabled={isGenerating || !projectName.trim() || !projectDescription.trim()}
              >
                {isGenerating ? '⏳ Generating...' : '🚀 Generate Project'}
              </button>
            </div>
          ) : activeTab === 'chat' ? (
            <div className={styles.chatArea}>
              <div className={styles.messages}>
                {messages.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span style={{ fontSize: '48px', marginBottom: '16px' }}>💬</span>
                    <h3>Start Chatting</h3>
                    <p>Ask for modifications, new features, or explanations</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`${styles.message} ${styles[msg.role]} ${msg.isError ? styles.error : ''}`}
                    >
                      <div className={styles.messageHeader}>
                        <span className={styles.role}>
                          {msg.role === 'user' ? '👤' : '⚔️'} {msg.role === 'user' ? 'You' : 'HAN Code'}
                        </span>
                        {msg.model && <span className={styles.model}>{msg.model}</span>}
                      </div>
                      <div className={styles.messageContent}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.inputArea}>
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask for modifications, new features, or explanations..."
                  className={styles.chatInput}
                  rows="3"
                  disabled={isGenerating}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSendMessage}
                  disabled={isGenerating || !inputMessage.trim()}
                >
                  {isGenerating ? '⏳' : '→'} Send
                </button>
              </div>
            </div>
          ) : activeTab === 'preview' ? (
            <div className={styles.previewArea}>
              <HanCodeIDEViewer
                projectType={projectType}
                code={generatedCode}
                projectName={projectName}
              />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
