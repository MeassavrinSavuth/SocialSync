'use client';

import React from 'react';
import TasksSection from './TasksSection';
import DraftsSection from './DraftsSection';
import MediaLibraryGrid from './MediaLibraryGrid';
import WorkspaceTabs from './WorkspaceTabs';

export default function WorkspaceContent({
  activeTab,
  onTabChange,
  selectedWorkspace,
  members,
  currentUser
}) {
  const renderContent = () => {
    if (!selectedWorkspace) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading workspace content...</div>
        </div>
      );
    }

    try {
      switch (activeTab) {
        case 'tasks':
          return (
            <TasksSection 
              workspaceId={selectedWorkspace?.id} 
              teamMembers={members} 
              currentUser={currentUser} 
            />
          );
        case 'drafts':
          return (
            <DraftsSection
              teamMembers={members}
              currentUser={currentUser}
              workspaceId={selectedWorkspace.id}
            />
          );
        case 'media':
          return <MediaLibraryGrid workspaceId={selectedWorkspace.id} />;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering workspace content:', error);
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error loading workspace content. Please try again.</div>
        </div>
      );
    }
  };

  return (
    <div>
      <WorkspaceTabs activeTab={activeTab} onTabChange={onTabChange} />
      {renderContent()}
    </div>
  );
} 