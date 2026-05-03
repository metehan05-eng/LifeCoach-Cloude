"use client";
import React, { useState } from 'react';
import styles from './ProjectHub.module.css';

export default function ProjectHub({ user, onClose }) {
  const [view, setView] = useState('list'); // list, create, detail
  const [projects, setProjects] = useState([
    { id: '1', name: 'Software engine', description: 'bir yazılım projesi üzerinde bir işletim sistemi olacak', updatedAt: '8 saniye önce' }
  ]);
  const [activeProject, setActiveProject] = useState(null);

  const renderListView = () => (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Projects</h1>
        <button className={styles.newBtn} onClick={() => setView('create')}>+ New project</button>
      </header>
      
      <div className={styles.searchBar}>
        <div className={styles.searchIcon}>🔍</div>
        <input type="text" placeholder="Search projects..." />
      </div>

      <div className={styles.sorting}>
        <span>Sort by</span>
        <select>
          <option>Activity</option>
          <option>Name</option>
        </select>
      </div>

      <div className={styles.grid}>
        {projects.length > 0 ? (
          projects.map(p => (
            <div key={p.id} className={styles.projectCard} onClick={() => { setActiveProject(p); setView('detail'); }}>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div className={styles.cardFooter}>Updated {p.updatedAt}</div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
             <div className={styles.emptyIcon}>📂</div>
             <h3>Looking to start a project?</h3>
             <p>Upload materials, set custom instructions, and organize conversations in one space.</p>
             <button className={styles.newBtn} onClick={() => setView('create')}>+ New project</button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCreateView = () => (
    <div className={styles.formContainer}>
      <h2>Create a personal project</h2>
      <div className={styles.infoBox}>
        <strong>How to use projects</strong>
        <p>Projects help organize your work and leverage knowledge across multiple conversations. Upload docs, code, and files to create themed collections that AI can reference again and again.</p>
      </div>
      <div className={styles.field}>
        <label>What are you working on?</label>
        <input type="text" placeholder="Name your project" />
      </div>
      <div className={styles.field}>
        <label>What are you trying to achieve?</label>
        <textarea placeholder="Describe your project, goals, subject, etc..." rows="4" />
      </div>
      <div className={styles.actions}>
        <button className={styles.cancelBtn} onClick={() => setView('list')}>Cancel</button>
        <button className={styles.createBtn}>Create project</button>
      </div>
    </div>
  );

  const renderDetailView = () => (
    <div className={styles.detailContainer}>
       <div className={styles.detailSidebar}>
          <button className={styles.backBtn} onClick={() => setView('list')}>← All projects</button>
          <div className={styles.sidebarSection}>
             <div className={styles.sectionTitle}>
                Instructions <span>+</span>
             </div>
             <p className={styles.hint}>Add instructions to tailor AI reactions</p>
          </div>
          <div className={styles.sidebarSection}>
            <div className={styles.sectionTitle}>
                Files <span>+</span>
             </div>
             <div className={styles.fileBox}>
                <div className={styles.fileIcon}>📄</div>
                <p>Add PDFs, documents, or other text to reference in this project.</p>
             </div>
          </div>
       </div>
       <div className={styles.detailMain}>
          <div className={styles.projectHead}>
             <h1>{activeProject?.name}</h1>
             <p>{activeProject?.description}</p>
          </div>
          <div className={styles.promptArea}>
             <div className={styles.promptInput}>
                How can I help you today?
                <div className={styles.promptActions}>
                   <span>+</span>
                   <span>Sonnet 4.2</span>
                </div>
             </div>
          </div>
          <div className={styles.chatPlaceholder}>
             Start a chat to keep conversations organized and re-use project knowledge.
          </div>
       </div>
    </div>
  );

  return (
    <div className={styles.overlay}>
       <div className={styles.modal}>
          <button className={styles.closeOverlay} onClick={onClose}>✕</button>
          {view === 'list' && renderListView()}
          {view === 'create' && renderCreateView()}
          {view === 'detail' && renderDetailView()}
       </div>
    </div>
  );
}
