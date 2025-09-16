import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import PlatformSelector from './PlatformSelector';
import MiniFacebookPreview from './MiniFacebookPreview';
import MiniMastodonPreview from './MiniMastodonPreview';
import MediaSelector from './MediaSelector';
import { FaCommentAlt, FaEllipsisH } from 'react-icons/fa';
import { useDraftPosts } from '../../hooks/api/useDraftPosts';
import { uploadToCloudinary } from '../../hooks/api/uploadToCloudinary';

export default function DraftsSection({ teamMembers, currentUser, workspaceId }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [openCommentDraftId, setOpenCommentDraftId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [menuOpenDraftId, setMenuOpenDraftId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [filterMember, setFilterMember] = useState('all');
  const [cloudMediaUrl, setCloudMediaUrl] = useState(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState(null);
  const [draftUploadProgress, setDraftUploadProgress] = useState(0);
  const [draftUploadSpeed, setDraftUploadSpeed] = useState(0);
  const [draftUploadAbortController, setDraftUploadAbortController] = useState(null);
  const [draftUploadSuccess, setDraftUploadSuccess] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState(null); // 'library' or 'upload'
  const menuRef = useRef();

  // Use backend-powered drafts
  const { drafts, loading, error, createDraft, updateDraft, deleteDraft, publishDraft } = useDraftPosts(workspaceId);

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPlatforms([]);
    setContent('');
    setTitle('');
    setMedia(null);
    setMediaPreview(null);
    setCloudMediaUrl(null);
    setSelectedMediaType(null);
    setEditDraft(null);
  };

  const handlePlatformToggle = (platformKey) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformKey)
        ? prev.filter((key) => key !== platformKey)
        : [...prev, platformKey]
    );
  };

  const handleMediaSelect = async (selectedItem, type) => {
    setSelectedMediaType(type);
    
    if (type === 'library') {
      // Use media from library directly
      setMediaPreview(selectedItem.file_url);
      setCloudMediaUrl(selectedItem.file_url);
      setMedia(null); // Clear file object since we're using library media
    } else if (type === 'upload') {
      // Handle file upload
      setMedia(selectedItem);
      setMediaPreview(URL.createObjectURL(selectedItem));
      setMediaUploading(true);
      setMediaUploadError(null);
      
      // Use AbortController to support cancel
      const controller = new AbortController();
      setDraftUploadAbortController(controller);
      setDraftUploadProgress(0);
      setDraftUploadSpeed(0);

      try {
        let lastLoaded = 0;
        let lastTime = Date.now();
        const url = await uploadToCloudinary(selectedItem, (percent) => {
          // percent is 0-100
          setDraftUploadProgress(percent);
          // estimate speed (bytes/sec) based on percent delta
          const now = Date.now();
          const elapsed = (now - lastTime) / 1000 || 1;
          const loaded = (percent / 100) * (selectedItem.size || 0);
          const delta = loaded - lastLoaded;
          const speed = delta / elapsed; // bytes per second
          setDraftUploadSpeed(speed);
          lastLoaded = loaded;
          lastTime = now;
        }, controller.signal);
        setCloudMediaUrl(url);
        setDraftUploadSuccess(true);
      } catch (err) {
        if (err && err.name === 'AbortError') {
          setMediaUploadError('Upload cancelled');
        } else {
          setMediaUploadError(err.message || 'Failed to upload media.');
        }
        setCloudMediaUrl(null);
      } finally {
        // keep success visible briefly
        if (draftUploadSuccess) {
          setTimeout(() => setDraftUploadSuccess(false), 1500);
        }
        setMediaUploading(false);
        setDraftUploadAbortController(null);
        // reset progress after a short delay on success
        setTimeout(() => setDraftUploadProgress(0), 1200);
        setDraftUploadSpeed(0);
      }
    }
  };

  const handleOpenMediaSelector = () => {
    setShowMediaSelector(true);
  };

  const handleCloseMediaSelector = () => {
    setShowMediaSelector(false);
  };

  const handleEditDraft = (draft) => {
    setEditDraft(draft);
    setShowModal(true);
    setTitle(draft.title || '');
    setContent(draft.content || '');
    setSelectedPlatforms(draft.platforms || []);
    setMediaPreview(draft.media && draft.media[0] ? draft.media[0] : null);
    setCloudMediaUrl(draft.media && draft.media[0] ? draft.media[0] : null);
    setMedia(null);
  };

  const handleDeleteDraft = async (draftId) => {
    await deleteDraft(draftId);
  };

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    if (!content.trim() || !title.trim() || selectedPlatforms.length === 0) return;
    if (editDraft) {
      await updateDraft(editDraft.id, {
        content,
        platforms: selectedPlatforms,
        media: cloudMediaUrl ? [cloudMediaUrl] : editDraft.media || [],
      });
      setEditDraft(null);
    } else {
      await createDraft({
        content,
        platforms: selectedPlatforms,
        media: cloudMediaUrl ? [cloudMediaUrl] : [],
      });
    }
    setTitle("");
    setContent("");
    setSelectedPlatforms([]);
    setMedia(null);
    setMediaPreview(null);
    setCloudMediaUrl(null);
    setSelectedMediaType(null);
    setShowModal(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenDraftId(null);
      }
    }
    if (menuOpenDraftId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenDraftId]);

  // Filter drafts by selected member
  const filteredDrafts = filterMember === 'all'
    ? drafts
    : drafts.filter(d => d.author && (d.author.id === filterMember || d.author.name === filterMember));

  return (
    <section>
      <div className="mb-4">
        <label className="mr-2 font-medium text-gray-700">Filter by member:</label>
        <select
          className="border rounded px-2 py-1 text-gray-700"
          value={filterMember}
          onChange={e => setFilterMember(e.target.value)}
        >
          <option value="all">All</option>
          {teamMembers && teamMembers.map(member => (
            <option key={member.id || member.name} value={member.id || member.name}>{member.name}</option>
          ))}
        </select>
      </div>
      <div className="mb-6">
        <button
          className="py-2 px-6 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold flex items-center gap-2"
          onClick={handleOpenModal}
        >
          + Add Draft
        </button>
      </div>
      <Modal open={showModal} onClose={handleCloseModal}>
        <div className="p-0 md:p-8 flex flex-col md:flex-row md:space-x-8">
          {/* Form Container */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleCreateDraft} className="space-y-4">
              <label className="block text-base font-semibold text-gray-800 mb-2">Platforms</label>
              <PlatformSelector selectedPlatforms={selectedPlatforms} togglePlatform={handlePlatformToggle} />
              <label className="block text-base font-semibold text-gray-800 mb-1">Title</label>
              <input
                type="text"
                className="w-full border-0 bg-gray-100 rounded-xl px-4 py-3 text-xl text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (e.g. Spring Campaign)"
                maxLength={80}
                required
              />
              <label className="block text-base font-semibold text-gray-800 mb-1">Content</label>
              <textarea
                className="w-full border-0 bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content here..."
                rows={5}
                required
              />
              <label className="block text-base font-semibold text-gray-800 mb-1">Media</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleOpenMediaSelector}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
                >
                  Select Media
                </button>
                {mediaPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setMedia(null);
                      setMediaPreview(null);
                      setCloudMediaUrl(null);
                      setSelectedMediaType(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              {/* Upload Progress (media-like) */}
              {(mediaUploading || draftUploadSuccess) && (
                <div className="space-y-3 mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ease-out shadow-sm ${draftUploadSuccess ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                      style={{ width: `${draftUploadProgress}%` }}
                    >
                      <div className="h-full bg-gradient-to-r from-transparent to-white opacity-30 rounded-full" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className={`flex items-center space-x-2 ${draftUploadSuccess ? 'text-green-600' : 'text-blue-600'}`}>
                      {!draftUploadSuccess ? (
                        <>
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-medium">{draftUploadProgress < 100 ? `Uploading ${media && media.name ? media.name : 'file'}...` : 'Processing...'}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-green-600 font-medium">Upload completed successfully!</span>
                        </>
                      )}
                    </div>
                    <div className={`font-semibold ${draftUploadSuccess ? 'text-green-600' : 'text-gray-600'}`}>{draftUploadProgress}%</div>
                  </div>

                  {!draftUploadSuccess && (
                    <div className="text-xs text-gray-500 text-center">
                      <div className="space-y-1">
                        <div>
                          {Math.round((media?.size || 0) * (draftUploadProgress / 100) / (1024 * 1024))}MB of {Math.round((media?.size || 0) / (1024 * 1024))}MB uploaded
                        </div>
                        {draftUploadSpeed > 0 && (
                          <div className="text-blue-500">
                            {draftUploadSpeed > 1024 * 1024 ? `${(draftUploadSpeed / (1024 * 1024)).toFixed(1)} MB/s` : `${(draftUploadSpeed / 1024).toFixed(0)} KB/s`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!draftUploadSuccess && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { if (draftUploadAbortController) draftUploadAbortController.abort(); }}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded"
                      >
                        Cancel Upload
                      </button>
                    </div>
                  )}
                </div>
              )}
              {mediaUploading && <div className="text-blue-600 text-sm mt-1">Uploading media...</div>}
              {mediaUploadError && <div className="text-red-600 text-sm mt-1">{mediaUploadError}</div>}
              {mediaPreview && (
                <div className="mt-2">
                  {mediaPreview.match(/\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i) ? (
                    <video src={mediaPreview} controls className="max-w-xs h-32 object-contain rounded-xl border" />
                  ) : (
                    <img src={mediaPreview} alt="Media Preview" className="max-w-xs h-32 object-contain rounded-xl border" />
                  )}
                </div>
              )}
              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {editDraft ? 'Update Draft' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
          {/* Preview Container */}
          <div className="hidden md:block flex-1">
            {selectedPlatforms.includes('facebook') && (
              <MiniFacebookPreview 
                task={{
                  id: 0,
                  title: title,
                  description: content,
                  author: currentUser || { name: 'User', avatar: '/default-avatar.png' },
                  status: 'Draft',
                  assigned: [],
                  reactions: { thumbsUp: 0 },
                  comments: [],
                  photo: mediaPreview,
                  platforms: selectedPlatforms,
                }}
                onReact={() => {}}
                showReactions={false}
              />
            )}
            {selectedPlatforms.includes('mastodon') && (
              <MiniMastodonPreview 
                task={{
                  id: 0,
                  title: title,
                  description: content,
                  author: currentUser || { name: 'User', avatar: '/default-avatar.png' },
                  status: 'Draft',
                  assigned: [],
                  reactions: { thumbsUp: 0 },
                  comments: [],
                  photo: mediaPreview,
                  platforms: selectedPlatforms,
                }}
                onReact={() => {}}
                showReactions={false}
              />
            )}
          </div>
        </div>
      </Modal>
      {/* Drafts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {loading && <div className="text-gray-500 col-span-full">Loading drafts...</div>}
        {error && <div className="text-red-500 col-span-full">Error: {error}</div>}
        {filteredDrafts.map((draft) => (
          <div key={draft.id} className="h-fit">
            {draft.platforms && draft.platforms.includes('facebook') && (
              <div className="w-full">
                <MiniFacebookPreview
                  task={{
                    ...draft,
                    description: draft.content,
                    photo: draft.media && draft.media[0],
                    author: draft.author || currentUser || { name: 'Unknown', avatar: '/default-avatar.png' },
                    reactions: draft.reactions || { thumbsUp: 0 },
                    comments: draft.comments || [],
                  }}
                  showReactions={true}
                  showTitle={false}
                  onReact={() => {}}
                  fullWidth={true}
                  onEdit={() => handleEditDraft(draft)}
                  onDelete={() => handleDeleteDraft(draft.id)}
                  onPost={() => publishDraft(draft.id)}
                />
              </div>
            )}
            {draft.platforms && draft.platforms.includes('mastodon') && (
              <div className="w-full">
                <MiniMastodonPreview
                  task={{
                    ...draft,
                    description: draft.content,
                    photo: draft.media && draft.media[0],
                    author: draft.author || currentUser || { name: 'Unknown', avatar: '/default-avatar.png' },
                    reactions: draft.reactions || { thumbsUp: 0 },
                    comments: draft.comments || [],
                  }}
                  showReactions={true}
                  showTitle={false}
                  onReact={() => {}}
                  fullWidth={true}
                  onEdit={() => handleEditDraft(draft)}
                  onDelete={() => handleDeleteDraft(draft.id)}
                  onPost={() => publishDraft(draft.id)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Media Selector Modal */}
      {showMediaSelector && (
        <MediaSelector
          workspaceId={workspaceId}
          onMediaSelect={handleMediaSelect}
          selectedMedia={null}
          onClose={handleCloseMediaSelector}
        />
      )}
    </section>
  );
}