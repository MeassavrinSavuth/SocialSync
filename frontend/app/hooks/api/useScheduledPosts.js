import { useProtectedFetch } from '../auth/useProtectedFetch';

export function useScheduledPosts() {
  const protectedFetch = useProtectedFetch();

  const createScheduledPost = async ({ content, mediaFiles, platforms, scheduledTime, targets }) => {
    try {
      const res = await protectedFetch('/scheduled-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          media_urls: mediaFiles,
          platforms,
          scheduled_time: scheduledTime,
          targets,
        }),
      });

      if (!res) {
        return { success: false, error: 'No response from server' };
      }

      // If the helper returned a raw Response (e.g., 204), handle it
      if (res instanceof Response) {
        if (!res.ok) {
          const text = await res.text();
          return { success: false, error: text || 'Failed to schedule post' };
        }

        try {
          const json = await res.json();
          return { success: true, data: json };
        } catch (e) {
          return { success: true, data: null };
        }
      }

      // parsed JSON
      return { success: true, data: res };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getScheduledPosts = async () => {
    try {
      const res = await protectedFetch('/scheduled-posts');
      if (!res) {
        return { success: false, error: 'No response from server' };
      }

      if (res instanceof Response) {
        if (!res.ok) {
          const text = await res.text();
          return { success: false, error: text || 'Failed to fetch scheduled posts' };
        }

        const json = await res.json();
        return { success: true, data: json };
      }

      return { success: true, data: res };
    } catch (error) {
      console.log('Error fetching scheduled posts:', error);
      return { success: false, error: error.message };
    }
  };

  const updateScheduledPost = async (postId, updateData) => {
    try {
      const res = await protectedFetch(`/scheduled-posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!res) {
        return { success: false, error: 'No response from server' };
      }

      if (res instanceof Response) {
        if (!res.ok) {
          const text = await res.text();
          return { success: false, error: text || 'Failed to update scheduled post' };
        }

        const json = await res.json();
        return { success: true, data: json };
      }

      return { success: true, data: res };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteScheduledPost = async (postId) => {
    try {
      const res = await protectedFetch(`/scheduled-posts/${postId}`, {
        method: 'DELETE',
      });

      if (!res) {
        return { success: false, error: 'No response from server' };
      }

      if (res instanceof Response) {
        if (!res.ok) {
          const text = await res.text();
          return { success: false, error: text || 'Failed to delete scheduled post' };
        }

        return { success: true };
      }

      // If backend returned parsed JSON, assume success if no error field
      if (res && !res.error) {
        return { success: true };
      }

      return { success: false, error: res.error || 'Failed to delete scheduled post' };
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
