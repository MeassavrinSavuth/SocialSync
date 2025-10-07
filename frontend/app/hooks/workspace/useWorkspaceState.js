import { useState } from 'react';
import { useWorkspaces } from '../api/useWorkspaces';
import { useInvitations } from '../api/useInvitations';
import { useWorkspaceMembers } from '../api/useWorkspaceMembers';
import { useUser } from '../auth/useUser';

export function useWorkspaceState() {
  try {
    // API hooks
    const { workspaces, loading, error, createWorkspace, deleteWorkspace } = useWorkspaces();
    const { invitations, loading: invitationsLoading, error: invitationsError, sendInvitation, acceptInvitation, declineInvitation, fetchInvitations } = useInvitations();
    const { profileData: currentUser, isLoading: userLoading } = useUser();

  // Workspace selection state
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Form states
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceAvatar, setNewWorkspaceAvatar] = useState('');
  const [inviteError, setInviteError] = useState(null);

  // Member management states
  const [showMemberList, setShowMemberList] = useState(false);
  const [roleChangeLoading, setRoleChangeLoading] = useState({});

  // Workspace management states
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Kick member modal state
  const [showKickModal, setShowKickModal] = useState(false);
  const [kickMemberId, setKickMemberId] = useState(null);
  const [kickMemberName, setKickMemberName] = useState('');

  // Use workspace members hook - only when we have a selected workspace
  const { 
    members, 
    loading: membersLoading, 
    error: membersError, 
    refetch: fetchMembers, 
    leaveWorkspace, 
    removeMember, 
    changeMemberRole 
  } = useWorkspaceMembers(selectedWorkspace?.id);

  // Handlers
  const handleEnterWorkspace = (ws) => {
    setSelectedWorkspace(ws);
    setActiveTab('tasks');
  };

  const handleBackToDashboard = () => {
    setSelectedWorkspace(null);
    setActiveTab('tasks');
    setShowMemberList(false);
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    try {
      await createWorkspace({ name: newWorkspaceName, avatar: newWorkspaceAvatar });
      setNewWorkspaceName('');
      setNewWorkspaceAvatar('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleDeleteWorkspace = (workspaceId) => {
    setDeleteWorkspaceId(workspaceId);
  };

  const confirmDeleteWorkspace = async () => {
    if (!deleteWorkspaceId) return;
    
    setDeleteLoading(true);
    try {
      await deleteWorkspace(deleteWorkspaceId);
      setDeleteWorkspaceId(null);
      if (selectedWorkspace?.id === deleteWorkspaceId) {
        handleBackToDashboard();
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInviteMember = async (email, role) => {
    if (!selectedWorkspace) return;
    
    try {
      await sendInvitation(selectedWorkspace.id, email, role);
      setInviteError(null);
      setShowInviteMemberModal(false);
    } catch (error) {
      setInviteError(error.message);
    }
  };

  const handleOpenInviteMemberModal = () => {
    setInviteError(null); // Clear any previous errors
    setShowInviteMemberModal(true);
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (!selectedWorkspace) return;
    
    setRoleChangeLoading(prev => ({ ...prev, [memberId]: true }));
    try {
      await changeMemberRole(memberId, newRole);
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setRoleChangeLoading(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const handleLeaveWorkspace = () => {
    setShowLeaveModal(true);
  };

  const confirmLeaveWorkspace = async () => {
    if (!selectedWorkspace) return;
    
    setLeaveLoading(true);
    try {
      await leaveWorkspace(selectedWorkspace.id);
      handleBackToDashboard();
    } catch (error) {
      console.error('Failed to leave workspace:', error);
    } finally {
      setLeaveLoading(false);
      setShowLeaveModal(false);
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    setKickMemberId(memberId);
    setKickMemberName(memberName);
    setShowKickModal(true);
  };

  const confirmKickMember = async () => {
    if (!kickMemberId) return;
    try {
      await removeMember(kickMemberId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setShowKickModal(false);
      setKickMemberId(null);
      setKickMemberName('');
    }
  };

  const cancelKickMember = () => {
    setShowKickModal(false);
    setKickMemberId(null);
    setKickMemberName('');
  };

  return {
    // State
    workspaces,
    loading,
    error,
    currentUser,
    userLoading,
    invitations,
    invitationsLoading,
    invitationsError,
    selectedWorkspace,
    activeTab,
    members,
    membersLoading,
    membersError,
    
    // Modal states
    showCreateModal,
    setShowCreateModal,
    showInvitesModal,
    setShowInvitesModal,
    showInviteMemberModal,
    setShowInviteMemberModal,
    showLeaveModal,
    setShowLeaveModal,
    showMemberList,
    setShowMemberList,
    
    // Form states
    newWorkspaceName,
    setNewWorkspaceName,
    newWorkspaceAvatar,
    setNewWorkspaceAvatar,
    inviteError,
    setInviteError,
    
    // Loading states
    roleChangeLoading,
    deleteWorkspaceId,
    setDeleteWorkspaceId,
    deleteLoading,
    leaveLoading,
    
    // Handlers
    handleEnterWorkspace,
    handleBackToDashboard,
    handleCreateWorkspace,
    handleDeleteWorkspace,
    confirmDeleteWorkspace,
    handleInviteMember,
    handleOpenInviteMemberModal,
    handleRoleChange,
    handleLeaveWorkspace,
    confirmLeaveWorkspace,
    handleRemoveMember,
    setActiveTab,
    
    // API functions
    acceptInvitation,
    declineInvitation,
    fetchInvitations,
    fetchMembers,
    showKickModal,
    kickMemberId,
    kickMemberName,
    confirmKickMember,
    cancelKickMember
  };
  } catch (error) {
    console.error('Error in useWorkspaceState:', error);
    // Return safe default values
    return {
      workspaces: [],
      loading: false,
      error: error.message,
      currentUser: null,
      userLoading: false,
      invitations: [],
      invitationsLoading: false,
      selectedWorkspace: null,
      activeTab: 'tasks',
      members: [],
      membersLoading: false,
      membersError: null,
      showCreateModal: false,
      setShowCreateModal: () => {},
      showInvitesModal: false,
      setShowInvitesModal: () => {},
      showInviteMemberModal: false,
      setShowInviteMemberModal: () => {},
      showLeaveModal: false,
      setShowLeaveModal: () => {},
      showMemberList: false,
      setShowMemberList: () => {},
      newWorkspaceName: '',
      setNewWorkspaceName: () => {},
      newWorkspaceAvatar: '',
      setNewWorkspaceAvatar: () => {},
      inviteError: null,
      setInviteError: () => {},
      roleChangeLoading: {},
      deleteWorkspaceId: null,
      setDeleteWorkspaceId: () => {},
      deleteLoading: false,
      leaveLoading: false,
      handleEnterWorkspace: () => {},
      handleBackToDashboard: () => {},
      handleCreateWorkspace: async () => {},
      handleDeleteWorkspace: () => {},
      confirmDeleteWorkspace: async () => {},
      handleInviteMember: async () => {},
      handleOpenInviteMemberModal: () => {},
      handleRoleChange: async () => {},
      handleLeaveWorkspace: () => {},
      confirmLeaveWorkspace: async () => {},
      handleRemoveMember: () => {},
      setActiveTab: () => {},
      acceptInvitation: async () => {},
      declineInvitation: async () => {},
      fetchInvitations: async () => {},
      fetchMembers: async () => {},
      showKickModal: false,
      kickMemberId: null,
      kickMemberName: '',
      confirmKickMember: async () => {},
      cancelKickMember: () => {}
    };
  }
} 