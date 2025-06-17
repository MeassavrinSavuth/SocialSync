'use client'

// pages/create-post.js
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import SidebarAccounts from '../../components/SidebarAccounts';
import ContentEditor from '../../components/ContentEditor';
import PostPreview from '../../components/PostPreview';

export default function CreatePostPage() {
    const [selectedAccounts, setSelectedAccounts] = useState([]); // Array of selected account IDs
    const [postContent, setPostContent] = useState('');
    const [postMedia, setPostMedia] = useState([]); // Array of File objects or URLs
    const [postLabels, setPostLabels] = useState([]); // Array of strings for labels (simpler for now)
    const [scheduledDateTime, setScheduledDateTime] = useState(null); // Date object for scheduling

    // State for preview
    const [previewAccount, setPreviewAccount] = useState(null);

    // Dummy data for accounts (replace with data fetched from Go backend)
    const [accounts, setAccounts] = useState([
        { id: '1', name: 'TestingPage', platform: 'facebook', img: 'https://via.placeholder.com/30/1a77f2/ffffff?text=F' }, // Example placeholder
        { id: '2', name: 'Kaung Sat Linn', platform: 'facebook', img: 'https://via.placeholder.com/30/1a77f2/ffffff?text=F' },
        { id: '3', name: 'cykoiznotoy', platform: 'instagram', img: 'https://via.placeholder.com/30/E4405F/ffffff?text=I' },
    ]);

    // Effect to set a default preview account if available and none is selected
    useEffect(() => {
        if (!previewAccount && accounts.length > 0) {
            setPreviewAccount(accounts[0]);
        }
    }, [accounts, previewAccount]);


    // Function to handle account selection for posting
    const handleAccountToggle = (accountId) => {
        setSelectedAccounts(prev => {
            const newSelected = prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId];

            // Auto-select first selected account for preview if no preview is active
            if (!previewAccount && newSelected.length > 0) {
                setPreviewAccount(accounts.find(acc => acc.id === newSelected[0]));
            } else if (previewAccount && !newSelected.includes(previewAccount.id) && newSelected.length > 0) {
                // If current preview account is unselected, pick a new one from selected
                setPreviewAccount(accounts.find(acc => acc.id === newSelected[0]));
            } else if (newSelected.length === 0) {
                setPreviewAccount(null); // No accounts selected, no preview
            }
            return newSelected;
        });
    };

    // Function to handle changing the preview account explicitly
    const handleChangePreviewAccount = (account) => {
        setPreviewAccount(account);
    };

    // Handlers for content editor
    const handleContentChange = (content) => setPostContent(content);
    const handleMediaChange = (files) => setPostMedia(files); // Files are File objects
    const handleLabelsChange = (e) => setPostLabels(e.target.value); // Simple string for labels

    // Handlers for action buttons
    const handleDraft = async () => {
        console.log('Saving as Draft:', { postContent, postMedia, postLabels, selectedAccounts });
        // Call Go backend API to save as draft
    };

    const handlePublish = async () => {
        if (selectedAccounts.length === 0) {
            alert('Please select at least one social account to publish.');
            return;
        }
        console.log('Publishing:', { postContent, postMedia, postLabels, selectedAccounts });
        // Call Go backend API to publish
    };

    const handleSchedule = async () => {
        if (selectedAccounts.length === 0) {
            alert('Please select at least one social account to schedule.');
            return;
        }
        if (!scheduledDateTime) {
            alert('Please select a date and time for scheduling.');
            return;
        }
        console.log('Scheduling:', { postContent, postMedia, postLabels, selectedAccounts, scheduledDateTime });
        // Call Go backend API to schedule
    };

    return (
        // Changed bg-gray-900 to bg-black or bg-gray-900 depending on desired depth
        <div className="grid grid-cols-[250px_1fr_300px] h-screen bg-gray-900 text-gray-100">
            <Head>
                <title>Create Post - Social Sync</title>
            </Head>

            <SidebarAccounts
                accounts={accounts}
                selectedAccounts={selectedAccounts}
                onAccountToggle={handleAccountToggle}
                onSelectPreviewAccount={handleChangePreviewAccount}
                previewAccount={previewAccount}
            />

            <ContentEditor
                postContent={postContent}
                onContentChange={handleContentChange}
                postMedia={postMedia}
                onMediaChange={handleMediaChange}
                postLabels={postLabels}
                onLabelsChange={handleLabelsChange}
                onDraft={handleDraft}
                onPublish={handlePublish}
                // onSchedule={onSchedule}
                scheduledDateTime={scheduledDateTime}
                onScheduleChange={setScheduledDateTime}
            />

            <PostPreview
                postContent={postContent}
                postMedia={postMedia}
                previewAccount={previewAccount}
            />
        </div>
    );
}
