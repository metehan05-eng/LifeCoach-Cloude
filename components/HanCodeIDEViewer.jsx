"use client";
import React, { useState, useEffect } from 'react';
import styles from './HanCodeIDEViewer.module.css';

export default function HanCodeIDEViewer({ projectType, code, projectName }) {
  const [showCode, setShowCode] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState({});

  // Parse code blocks from response
  const parseCodeBlocks = (content) => {
    if (!content) return [];
    
    const blocks = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const fileBlockRegex = /\[\[FILE:\s*([^\]]+)\]\]([\s\S]*?)\[\[\/FILE\]\]/g;
    
    let match;
    
    // Try file format first
    while ((match = fileBlockRegex.exec(content)) !== null) {
      blocks.push({
        type: 'file',
        path: match[1].trim(),
        language: match[1].split('.').pop(),
        content: match[2].trim(),
        codeBlock: `\`\`\`${match[1].split('.').pop()}\n${match[2].trim()}\n\`\`\``
      });
    }
    
    // Then parse regular code blocks
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const lang = match[1] || 'plaintext';
      const content = match[2];
      
      // Skip if already captured as file
      if (!blocks.some(b => b.codeBlock === match[0])) {
        blocks.push({
          type: 'code',
          language: lang,
          content: content.trim(),
          codeBlock: match[0]
        });
      }
    }
    
    return blocks;
  };

  const codeBlocks = parseCodeBlocks(code);

  const handleCopyCode = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDevicePreview = () => {
    const previewCode = codeBlocks
      .filter(b => b.type === 'file' && (b.language === 'html' || b.language === 'jsx' || b.language === 'tsx'))
      .map(b => b.content)
      .join('\n');

    return previewCode || '<div style="padding: 20px; text-align: center; color: #999;">No preview available</div>';
  };

  const projectConfig = {
    mobile: {
      icon: '📱',
      label: 'Mobile Preview',
      width: '375px',
      height: '812px',
      device: 'iPhone 14 Pro'
    },
    web: {
      icon: '🌐',
      label: 'Web Preview',
      width: '100%',
      height: '100%',
      device: 'Desktop'
    },
    desktop: {
      icon: '🖥️',
      label: 'Desktop Preview',
      width: '100%',
      height: '100%',
      device: 'Desktop App'
    },
    backend: {
      icon: '⚙️',
      label: 'API Response',
      width: '100%',
      height: '100%',
      device: 'Backend'
    },
    game: {
      icon: '🎮',
      label: 'Game Preview',
      width: '100%',
      height: '100%',
      device: 'Game Canvas'
    }
  };

  const config = projectConfig[projectType] || projectConfig.web;

  return (
    <div className={styles.viewer}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.projectIcon}>{config.icon}</span>
          <div className={styles.projectMeta}>
            <div className={styles.projectName}>{projectName}</div>
            <div className={styles.projectType}>{config.device}</div>
          </div>
        </div>
        
        <div className={styles.topBarRight}>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggleBtn} ${showCode ? styles.active : ''}`}
              onClick={() => setShowCode(!showCode)}
            >
              {'<>'} Code
            </button>
            <button
              className={`${styles.toggleBtn} ${showPreview ? styles.active : ''}`}
              onClick={() => setShowPreview(!showPreview)}
            >
              👁️ Preview
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.contentWrapper}>
        {/* Code Editor */}
        {showCode && (
          <div className={styles.codePanel} style={{ flex: showPreview ? 1 : '1' }}>
            <div className={styles.codePanelHeader}>
              <span className={styles.headerTitle}>Code</span>
              <button
                className={styles.copyBtn}
                onClick={() => {
                  const allCode = codeBlocks.map(b => b.codeBlock).join('\n\n');
                  handleCopyCode(allCode);
                }}
              >
                {copied ? '✓ Copied' : '📋 Copy All'}
              </button>
            </div>

            <div className={styles.fileTree}>
              {codeBlocks.length === 0 ? (
                <div className={styles.emptyFiles}>
                  <span style={{ fontSize: '28px', marginBottom: '12px' }}>📄</span>
                  <p>No code blocks found</p>
                </div>
              ) : (
                codeBlocks.map((block, idx) => (
                  <div key={idx} className={styles.fileItem}>
                    <div
                      className={styles.fileName}
                      onClick={() => setExpandedFiles(prev => ({
                        ...prev,
                        [idx]: !prev[idx]
                      }))}
                    >
                      <span className={styles.expandIcon}>
                        {expandedFiles[idx] ? '▼' : '▶'}
                      </span>
                      <span className={styles.fileIcon}>
                        {block.type === 'file' ? '📄' : '💬'}
                      </span>
                      <span className={styles.fileNameText}>
                        {block.path || `Code Block (${block.language})`}
                      </span>
                    </div>

                    {expandedFiles[idx] && (
                      <div className={styles.fileContent}>
                        <div className={styles.codeHeader}>
                          <span className={styles.langBadge}>{block.language}</span>
                          <button
                            className={styles.copySingleBtn}
                            onClick={() => handleCopyCode(block.content)}
                          >
                            📋 Copy
                          </button>
                        </div>
                        <pre className={styles.codeBlock}>
                          <code>{block.content}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Preview Area */}
        {showPreview && (
          <div className={styles.previewPanel} style={{ flex: showCode ? 1 : '1' }}>
            <div className={styles.previewHeader}>
              <span className={styles.headerTitle}>{config.label}</span>
            </div>

            {projectType === 'mobile' ? (
              <div className={styles.mobileFrame}>
                <div className={styles.notch}></div>
                <div className={styles.screen}>
                  <div className={styles.screenContent}>
                    <span style={{ fontSize: '48px', opacity: 0.6 }}>📱</span>
                    <h3>Mobile Preview</h3>
                    <p style={{ opacity: 0.7, fontSize: '12px' }}>
                      Your {projectName} app will appear here
                    </p>
                  </div>
                </div>
              </div>
            ) : projectType === 'backend' ? (
              <div className={styles.previewContent}>
                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>API Endpoint</h3>
                    <div className={styles.codeBlock} style={{ padding: '12px', background: 'rgba(0,0,0,0.3)' }}>
                      <code style={{ fontSize: '12px' }}>
                        {`POST /api/${projectName?.toLowerCase().replace(/\s+/g, '-')}`}
                      </code>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Response Structure</h3>
                    <pre className={styles.codeBlock} style={{ padding: '12px' }}>
                      <code style={{ fontSize: '11px' }}>{`{
  "status": "success",
  "data": { ... },
  "message": "Request successful"
}`}</code>
                    </pre>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
                      ⚙️ Backend is ready to be deployed. Check the code tab for implementation details.
                    </p>
                  </div>
                </div>
              </div>
            ) : projectType === 'game' ? (
              <div className={styles.previewContent}>
                <canvas
                  id="gameCanvas"
                  width="800"
                  height="600"
                  style={{
                    background: '#000',
                    width: '100%',
                    height: '100%',
                    display: 'block'
                  }}
                />
              </div>
            ) : (
              <div className={styles.previewContent}>
                <div style={{ padding: '24px', textAlign: 'center', opacity: 0.6 }}>
                  <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>
                    {config.icon}
                  </span>
                  <h3>Preview Coming Soon</h3>
                  <p>Your {projectName} will render here once deployed</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Download Section */}
      <div className={styles.downloadBar}>
        <button className={styles.downloadBtn}>
          📥 Download Project Files
        </button>
        <button className={styles.shareBtn}>
          🔗 Share Project
        </button>
        <button className={styles.deployBtn}>
          🚀 Deploy Now
        </button>
      </div>
    </div>
  );
}
