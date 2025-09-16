import { useProtectedFetch } from '../auth/useProtectedFetch';

export function useScheduledPosts() {
  const protectedFetch = useProtectedFetch();

  const createScheduledPost = async ({ content, mediaFiles, platforms, scheduledTime }) => {
    try {
      const response = await protectedFetch('http://localhost:8080/api/scheduled-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          media_urls: mediaFiles,
          platforms,
          scheduled_time: scheduledTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to schedule post');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getScheduledPosts = async () => {
    try {
      const response = await protectedFetch('http://localhost:8080/api/scheduled-posts');
      console.log('Fetch scheduled posts response:', response);
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled posts');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.log('Error fetching scheduled posts:', error);
      return { success: false, error: error.message };
    }
  };

  const updateScheduledPost = async (postId, updateData) => {
    try {
      const response = await protectedFetch(`http://localhost:8080/api/scheduled-posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to update scheduled post');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteScheduledPost = async (postId) => {
    try {
      const response = await protectedFetch(`http://localhost:8080/api/scheduled-posts/${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to delete scheduled post');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    createScheduledPost,
    getScheduledPosts,
    updateScheduledPost,
    deleteScheduledPost,
  };
}
